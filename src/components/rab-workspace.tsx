"use client";

import { useMemo, useState } from "react";

type CategoryId = "personel" | "committee" | "nonPersonel";

type RabItem = {
  id: string;
  category: CategoryId;
  description: string;
  qty: number;
  unit: string;
  duration: number;
  durationUnit: string;
  rate: number;
};

type RevenueState = {
  sellingPrice: number;
  vatPercent: number;
  institutionalFeePercent: number;
};

const categories: Array<{ id: CategoryId; title: string; label: string; note: string }> = [
  {
    id: "personel",
    title: "Honor Personel",
    label: "A. Biaya Personel",
    note: "Narasumber, pemateri, fasilitator, atau pekerjaan berbasis jam/sesi."
  },
  {
    id: "committee",
    title: "Honor Kepanitiaan",
    label: "B. Honor Kepanitiaan",
    note: "PIC, co-PIC, operator, desain, MC, dan tim pelaksana kegiatan."
  },
  {
    id: "nonPersonel",
    title: "Biaya Non-Personel",
    label: "C. Biaya Non-Personel",
    note: "Seminar kit, sertifikat, konsumsi, ongkir, dan kebutuhan operasional."
  }
];

const initialRevenue: RevenueState = {
  sellingPrice: 125_000_000,
  vatPercent: 12,
  institutionalFeePercent: 10
};

const initialItems: RabItem[] = [
  { id: "p-1", category: "personel", description: "Honor Narasumber 1", qty: 1, unit: "orang", duration: 4, durationUnit: "jam", rate: 2_000_000 },
  { id: "p-2", category: "personel", description: "Honor Narasumber 2", qty: 1, unit: "orang", duration: 2, durationUnit: "jam", rate: 2_000_000 },
  { id: "p-3", category: "personel", description: "Honor Narasumber 3", qty: 1, unit: "orang", duration: 2, durationUnit: "jam", rate: 2_000_000 },
  { id: "p-4", category: "personel", description: "Honor buat soal quiz & setting quiz", qty: 6, unit: "quiz", duration: 1, durationUnit: "paket", rate: 350_000 },
  { id: "k-1", category: "committee", description: "Panitia 1 - PIC", qty: 1, unit: "orang", duration: 4, durationUnit: "hari", rate: 1_000_000 },
  { id: "k-2", category: "committee", description: "Panitia 2 - Co-PIC, design, operator", qty: 1, unit: "orang", duration: 4, durationUnit: "hari", rate: 500_000 },
  { id: "k-3", category: "committee", description: "Panitia 3", qty: 1, unit: "orang", duration: 4, durationUnit: "hari", rate: 250_000 },
  { id: "k-4", category: "committee", description: "Panitia 4", qty: 1, unit: "orang", duration: 4, durationUnit: "hari", rate: 200_000 },
  { id: "n-1", category: "nonPersonel", description: "Paket seminar kit", qty: 9, unit: "paket", duration: 1, durationUnit: "kali", rate: 200_000 },
  { id: "n-2", category: "nonPersonel", description: "Sertifikat", qty: 9, unit: "paket", duration: 1, durationUnit: "kali", rate: 20_000 },
  { id: "n-3", category: "nonPersonel", description: "Ongkir seminar kit & sertifikat", qty: 9, unit: "paket", duration: 1, durationUnit: "kali", rate: 50_000 },
  { id: "n-4", category: "nonPersonel", description: "Lunch panitia", qty: 8, unit: "pax", duration: 1, durationUnit: "hari", rate: 50_000 }
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0);
}

function formatInputValue(value: number) {
  return String(Number.isFinite(value) ? value : 0);
}

function getItemTotal(item: RabItem) {
  return Number(item.qty || 0) * Number(item.duration || 0) * Number(item.rate || 0);
}

export function RabWorkspace() {
  const [title, setTitle] = useState("RAB Kegiatan Pelatihan");
  const [revenue, setRevenue] = useState(initialRevenue);
  const [items, setItems] = useState(initialItems);

  const totals = useMemo(() => {
    const dpp = Math.round(revenue.sellingPrice / (1 + revenue.vatPercent / 100));
    const ppn = revenue.sellingPrice - dpp;
    const afterPpn = revenue.sellingPrice - ppn;
    const institutionalFee = Math.round(afterPpn * revenue.institutionalFeePercent / 100);
    const actualRevenue = afterPpn - institutionalFee;

    const byCategory = categories.reduce<Record<CategoryId, number>>((acc, category) => {
      acc[category.id] = items
        .filter((item) => item.category === category.id)
        .reduce((sum, item) => sum + getItemTotal(item), 0);
      return acc;
    }, { personel: 0, committee: 0, nonPersonel: 0 });

    const operational = byCategory.personel + byCategory.committee + byCategory.nonPersonel;
    return {
      dpp,
      ppn,
      afterPpn,
      institutionalFee,
      actualRevenue,
      byCategory,
      operational,
      margin: actualRevenue - operational
    };
  }, [items, revenue]);

  function updateRevenue(patch: Partial<RevenueState>) {
    setRevenue((current) => ({ ...current, ...patch }));
  }

  function updateItem(id: string, patch: Partial<RabItem>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function addItem(category: CategoryId) {
    setItems((current) => [
      ...current,
      {
        id: `${category}-${Date.now()}`,
        category,
        description: "Item baru",
        qty: 1,
        unit: category === "nonPersonel" ? "paket" : "orang",
        duration: 1,
        durationUnit: category === "personel" ? "jam" : "hari",
        rate: 0
      }
    ]);
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <main className="rab-page">
      <div className="rab-shell">
        <header className="rab-hero">
          <div className="rab-hero-copy">
            <div className="rab-kicker">Aksara Art House</div>
            <input
              className="rab-title-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              aria-label="Judul RAB"
            />
            <p>
              Tabel RAB editable dengan rumus otomatis: jumlah x durasi/jam x harga satuan.
              Struktur dipisah antara honor personel, honor kepanitiaan, dan biaya non-personel.
            </p>
          </div>
          <div className="rab-hero-actions">
            <button onClick={() => window.print()}>Cetak / PDF</button>
          </div>
        </header>

        <section className="rab-summary-bar" aria-label="Ringkasan RAB">
          <SummaryTile label="Penerimaan Aktual" value={formatCurrency(totals.actualRevenue)} highlight />
          <SummaryTile label="Total Operasional" value={formatCurrency(totals.operational)} />
          <SummaryTile label="Margin" value={formatCurrency(totals.margin)} state={totals.margin >= 0 ? "positive" : "negative"} />
        </section>

        <section className="rab-panel">
          <div className="rab-panel-header">
            <div>
              <h2>Nilai Investasi</h2>
              <p>Komponen penerimaan sebelum dikurangi biaya operasional.</p>
            </div>
          </div>
          <div className="rab-investment-grid">
            <EditableValue label="Harga Jual" value={revenue.sellingPrice} onChange={(value) => updateRevenue({ sellingPrice: value })} />
            <ReadOnlyValue label="DPP" value={formatCurrency(totals.dpp)} />
            <EditableValue label="PPN" suffix="%" value={revenue.vatPercent} onChange={(value) => updateRevenue({ vatPercent: value })} />
            <ReadOnlyValue label="(-) PPN" value={formatCurrency(totals.ppn)} />
            <EditableValue label="Institutional Fee" suffix="%" value={revenue.institutionalFeePercent} onChange={(value) => updateRevenue({ institutionalFeePercent: value })} />
            <ReadOnlyValue label="(-) Institutional Fee" value={formatCurrency(totals.institutionalFee)} />
          </div>
          <div className="rab-panel-total">
            <span>Total Penerimaan Aktual</span>
            <strong>{formatCurrency(totals.actualRevenue)}</strong>
          </div>
        </section>

        <section className="rab-panel">
          <div className="rab-panel-header">
            <div>
              <h2>Deduction - Biaya Operasional</h2>
              <p>Semua item dapat diubah langsung dari tabel.</p>
            </div>
          </div>

          {categories.map((category) => (
            <RabCategoryTable
              key={category.id}
              category={category}
              items={items.filter((item) => item.category === category.id)}
              subtotal={totals.byCategory[category.id]}
              onAdd={addItem}
              onRemove={removeItem}
              onUpdate={updateItem}
            />
          ))}

          <div className="rab-final-total">
            <div>
              <span>Total Biaya Pelatihan</span>
              <strong>{formatCurrency(totals.operational)}</strong>
            </div>
            <div>
              <span>Sisa / Margin</span>
              <strong className={totals.margin >= 0 ? "is-positive" : "is-negative"}>{formatCurrency(totals.margin)}</strong>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryTile({
  label,
  value,
  highlight,
  state
}: {
  label: string;
  value: string;
  highlight?: boolean;
  state?: "positive" | "negative";
}) {
  return (
    <div className={`rab-summary-tile ${highlight ? "is-highlight" : ""}`}>
      <span>{label}</span>
      <strong className={state === "positive" ? "is-positive" : state === "negative" ? "is-negative" : ""}>{value}</strong>
    </div>
  );
}

function EditableValue({
  label,
  value,
  suffix,
  onChange
}: {
  label: string;
  value: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rab-investment-row">
      <span>{label}</span>
      <div className="rab-inline-input">
        <input type="number" value={formatInputValue(value)} onChange={(event) => onChange(Number(event.target.value))} />
        {suffix ? <em>{suffix}</em> : null}
      </div>
    </label>
  );
}

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rab-investment-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RabCategoryTable({
  category,
  items,
  subtotal,
  onAdd,
  onRemove,
  onUpdate
}: {
  category: (typeof categories)[number];
  items: RabItem[];
  subtotal: number;
  onAdd: (category: CategoryId) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<RabItem>) => void;
}) {
  return (
    <div className="rab-category">
      <div className="rab-category-header">
        <div>
          <span>{category.label}</span>
          <h3>{category.title}</h3>
          <p>{category.note}</p>
        </div>
        <button onClick={() => onAdd(category.id)}>Tambah Item</button>
      </div>

      <div className="rab-table-scroll">
        <table className="rab-table">
          <thead>
            <tr>
              <th>Uraian</th>
              <th>Jumlah</th>
              <th>Satuan</th>
              <th>Durasi</th>
              <th>Per</th>
              <th>Harga Satuan</th>
              <th>Total</th>
              <th className="rab-row-action" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <input
                    className="rab-text-input"
                    value={item.description}
                    onChange={(event) => onUpdate(item.id, { description: event.target.value })}
                  />
                </td>
                <td><NumberField value={item.qty} onChange={(value) => onUpdate(item.id, { qty: value })} /></td>
                <td>
                  <input className="rab-unit-input" value={item.unit} onChange={(event) => onUpdate(item.id, { unit: event.target.value })} />
                </td>
                <td><NumberField value={item.duration} onChange={(value) => onUpdate(item.id, { duration: value })} /></td>
                <td>
                  <input
                    className="rab-unit-input"
                    value={item.durationUnit}
                    onChange={(event) => onUpdate(item.id, { durationUnit: event.target.value })}
                  />
                </td>
                <td><NumberField value={item.rate} onChange={(value) => onUpdate(item.id, { rate: value })} /></td>
                <td className="rab-money-cell">{formatCurrency(getItemTotal(item))}</td>
                <td className="rab-row-action">
                  <button onClick={() => onRemove(item.id)}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6}>Total {category.title}</td>
              <td>{formatCurrency(subtotal)}</td>
              <td className="rab-row-action" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function NumberField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <input className="rab-number-input" type="number" value={formatInputValue(value)} onChange={(event) => onChange(Number(event.target.value))} />;
}
