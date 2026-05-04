(function () {
  var managedKeys = {
    "aksara-paintings": true,
    "aksara-auctions": true,
    "aksara-orders": true,
    "aksara-cart": true,
    "aksara-wishlist": true,
    "aksara-user": true,
    "murni-admin-settings": true
  };

  var memory = {};
  var configured = false;
  var nativeStorage = null;

  try {
    nativeStorage = window.localStorage;
  } catch (e) {
    nativeStorage = null;
  }

  function isManaged(key) {
    return !!managedKeys[String(key)];
  }

  function notify(message) {
    window.__aksaraDbStatus = message;
    try {
      window.dispatchEvent(new CustomEvent("aksara-db-status", { detail: message }));
    } catch (e) {}
  }

  function request(method, url, body) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, false);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(body ? JSON.stringify(body) : null);
    if (xhr.status < 200 || xhr.status >= 300) {
      throw new Error(xhr.responseText || "Database request failed");
    }
    return xhr.responseText ? JSON.parse(xhr.responseText) : null;
  }

  function loadInitialValues() {
    try {
      var result = request("GET", "/api/legacy-store");
      configured = !!result.configured;
      memory = result.values || {};
      notify(configured ? "Data tersambung ke Supabase." : "Supabase belum dikonfigurasi. Data perubahan belum tersimpan permanen.");
    } catch (e) {
      configured = false;
      memory = {};
      notify("Database belum bisa diakses. Perubahan tidak disimpan permanen.");
    }
  }

  function persist(key, value) {
    if (!configured || !isManaged(key)) return;

    fetch("/api/legacy-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: key, value: String(value) }),
      keepalive: true
    }).catch(function () {
      notify("Gagal menyimpan ke database. Cek konfigurasi Supabase.");
    });
  }

  function removeRemote(key) {
    if (!configured || !isManaged(key)) return;

    fetch("/api/legacy-store?key=" + encodeURIComponent(key), {
      method: "DELETE",
      keepalive: true
    }).catch(function () {
      notify("Gagal menghapus data dari database.");
    });
  }

  loadInitialValues();

  var shim = {
    getItem: function (key) {
      key = String(key);
      if (isManaged(key)) {
        return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
      }
      return null;
    },
    setItem: function (key, value) {
      key = String(key);
      value = String(value);
      if (isManaged(key)) {
        memory[key] = value;
        persist(key, value);
      }
    },
    removeItem: function (key) {
      key = String(key);
      if (isManaged(key)) {
        delete memory[key];
        removeRemote(key);
      }
    },
    clear: function () {
      Object.keys(memory).forEach(function (key) {
        delete memory[key];
        removeRemote(key);
      });
    },
    key: function (index) {
      return Object.keys(memory)[index] || null;
    },
    get length() {
      return Object.keys(memory).length;
    }
  };

  try {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      enumerable: true,
      value: shim
    });
  } catch (e) {
    notify("Browser tidak mengizinkan penggantian localStorage.");
  }

  window.__aksaraLegacyDb = {
    configured: function () {
      return configured;
    },
    dump: function () {
      return JSON.parse(JSON.stringify(memory));
    },
    nativeStorage: nativeStorage
  };
})();

