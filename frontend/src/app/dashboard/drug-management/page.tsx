"use client";
import React, { useState, ChangeEvent, FormEvent } from "react";

interface Drug {
  name: string;
  query: string;
  manufacturer: string;
  rsi: string;
  nextSearch: string;
  status: string;
}

interface DrugFormErrors {
  name?: string;
  query?: string;
  manufacturer?: string;
  rsi?: string;
  nextSearch?: string;
}

export default function DrugManagementPage() {
  // Pagination and search state
  const [pageSize, setPageSize] = useState(10);
  const [drugs, setDrugs] = useState<Drug[]>([
    {
      name: "Aspirin",
      query: 'aspirin[tiab] AND ("adverse event"[tiab] OR "side effect"[tiab])',
      manufacturer: "Bayer AG",
      rsi: "RSI-ASP-001",
      nextSearch: "2024-12-15",
      status: "Active"
    },
    {
      name: "Metformin",
      query: 'metformin[tiab] AND ("adverse event"[tiab] OR "safety"[tiab])',
      manufacturer: "Merck KGaA",
      rsi: "RSI-MET-001",
      nextSearch: "2024-12-16",
      status: "Active"
    },
    {
      name: "Lisinopril",
      query: 'lisinopril[tiab] AND ("adverse event"[tiab] OR "toxicity"[tiab])',
      manufacturer: "AstraZeneca",
      rsi: "RSI-LIS-001",
      nextSearch: "2024-12-17",
      status: "Active"
    },
    // Dummy data for pagination testing
    {
      name: "Ibuprofen",
      query: 'ibuprofen[tiab] AND ("adverse event"[tiab] OR "pain"[tiab])',
      manufacturer: "Pfizer",
      rsi: "RSI-IBU-001",
      nextSearch: "2024-12-18",
      status: "Active"
    },
    {
      name: "Paracetamol",
      query: 'paracetamol[tiab] AND ("adverse event"[tiab] OR "fever"[tiab])',
      manufacturer: "Johnson & Johnson",
      rsi: "RSI-PARA-001",
      nextSearch: "2024-12-19",
      status: "Inactive"
    },
    {
      name: "Atorvastatin",
      query: 'atorvastatin[tiab] AND ("adverse event"[tiab] OR "cholesterol"[tiab])',
      manufacturer: "Pfizer",
      rsi: "RSI-ATOR-001",
      nextSearch: "2024-12-20",
      status: "Active"
    },
    {
      name: "Amlodipine",
      query: 'amlodipine[tiab] AND ("adverse event"[tiab] OR "hypertension"[tiab])',
      manufacturer: "Sun Pharma",
      rsi: "RSI-AMLO-001",
      nextSearch: "2024-12-21",
      status: "Inactive"
    },
    {
      name: "Simvastatin",
      query: 'simvastatin[tiab] AND ("adverse event"[tiab] OR "lipid"[tiab])',
      manufacturer: "Merck & Co.",
      rsi: "RSI-SIM-001",
      nextSearch: "2024-12-22",
      status: "Active"
    },
    {
      name: "Omeprazole",
      query: 'omeprazole[tiab] AND ("adverse event"[tiab] OR "acid"[tiab])',
      manufacturer: "AstraZeneca",
      rsi: "RSI-OME-001",
      nextSearch: "2024-12-23",
      status: "Active"
    },
    {
      name: "Losartan",
      query: 'losartan[tiab] AND ("adverse event"[tiab] OR "blood pressure"[tiab])',
      manufacturer: "Merck KGaA",
      rsi: "RSI-LOS-001",
      nextSearch: "2024-12-24",
      status: "Inactive"
    },
    {
      name: "Levothyroxine",
      query: 'levothyroxine[tiab] AND ("adverse event"[tiab] OR "thyroid"[tiab])',
      manufacturer: "AbbVie",
      rsi: "RSI-LEVO-001",
      nextSearch: "2024-12-25",
      status: "Active"
    }
  ]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState<Drug>({
    name: "",
    query: "",
    manufacturer: "",
    rsi: "",
    nextSearch: "",
    status: "Active"
  });
  const [errors, setErrors] = useState<DrugFormErrors>({});
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  function openAddModal() {
    setForm({ name: "", query: "", manufacturer: "", rsi: "", nextSearch: "", status: "Active" });
    setEditIndex(null);
    setErrors({});
    setModalOpen(true);
  }
  function openEditModal(idx: number) {
    setForm(drugs[idx]);
    setEditIndex(idx);
    setErrors({});
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    setErrors({});
  }
  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }
  function validate(form: Drug): DrugFormErrors {
    const errs: DrugFormErrors = {};
    if (!form.name.trim()) errs.name = "Drug name is required.";
    if (!form.query.trim()) errs.query = "Query is required.";
    if (!form.manufacturer.trim()) errs.manufacturer = "Manufacturer is required.";
    if (!form.rsi.trim()) errs.rsi = "RSI is required.";
    if (!form.nextSearch.trim()) errs.nextSearch = "Next search date is required.";
    return errs;
  }
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (editIndex === null) {
      setDrugs(prev => [...prev, form]);
      setForm({ name: "", query: "", manufacturer: "", rsi: "", nextSearch: "", status: "Active" });
    } else {
      setDrugs(drugs.map((d, i) => (i === editIndex ? form : d)));
    }
    setModalOpen(false);
  }
  function handleDelete(idx: number) {
    setDeleteIndex(idx);
  }
  function confirmDelete() {
    if (deleteIndex !== null) {
      setDrugs(drugs.filter((_, i) => i !== deleteIndex));
      setDeleteIndex(null);
    }
  }
  function cancelDelete() {
    setDeleteIndex(null);
  }

  // Filter and paginate drugs
  const filteredDrugs = drugs.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
    d.rsi.toLowerCase().includes(search.toLowerCase())
  );
  const pageCount = Math.ceil(filteredDrugs.length / pageSize);
  const pagedDrugs = filteredDrugs.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-white min-h-screen p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black text-blue-900 mb-1">Drug Management</h1>
            <div className="text-blue-700 text-base font-medium">Manage drug database including queries, sponsors, and RSI information</div>
          </div>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-lg shadow transition flex items-center gap-2 self-start sm:self-auto"
            onClick={openAddModal}
          >
            <span className="text-lg">+</span> Add New Drug
          </button>
        </div>
        {/* Table Controls: Page size left, search right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="pageSize" className="text-sm font-medium text-blue-900">Show</label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-blue-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500 bg-white text-blue-900"
            >
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-blue-900">entries</span>
          </div>
          <div className="flex gap-2 items-center w-full sm:w-auto justify-end">
            <input
              type="text"
              placeholder="Search by name, manufacturer, or RSI..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full sm:w-72 border-2 border-blue-200 rounded-lg px-4 py-2 text-base focus:outline-none focus:border-blue-500 bg-white text-blue-900"
            />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow border border-blue-100 p-0 overflow-x-auto">
          <div className="px-6 pt-6 pb-2 text-lg font-bold text-blue-900">Drugs Database ({filteredDrugs.length})</div>
          {/* Desktop Table */}
          <div className="hidden sm:block">
            <table className="min-w-full text-sm border border-blue-300 rounded-lg">
              <thead>
                <tr className="bg-blue-50 text-blue-900">
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap border-b border-blue-300">Drug Name</th>
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap border-b border-blue-300">Manufacturer</th>
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap border-b border-blue-300">RSI</th>
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap border-b border-blue-300">Next Search</th>
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap border-b border-blue-300">Status</th>
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap border-b border-blue-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedDrugs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-gray-400 border-b border-blue-200">No drugs found.</td>
                  </tr>
                ) : (
                  pagedDrugs.map((drug, idx) => (
                    <tr key={drug.name + idx} className="border-b border-blue-200 last:border-b-0">
                      <td className="py-3 px-4 font-bold text-blue-900 align-top border-r border-blue-100">
                        {drug.name}
                        <div className="text-xs font-mono text-gray-700 bg-gray-50 rounded px-1 py-0.5 mt-1 w-fit">{drug.query}</div>
                      </td>
                      <td className="py-3 px-4 align-top text-blue-900 border-r border-blue-100">{drug.manufacturer}</td>
                      <td className="py-3 px-4 align-top border-r border-blue-100">
                        <span className="bg-blue-100 text-blue-700 font-mono font-semibold px-2 py-1 rounded text-xs">{drug.rsi}</span>
                      </td>
                      <td className="py-3 px-4 align-top text-blue-900 border-r border-blue-100">{drug.nextSearch ? new Date(drug.nextSearch).toLocaleDateString() : ""}</td>
                      <td className="py-3 px-4 align-top border-r border-blue-100">
                        <span className="bg-green-100 text-green-700 font-semibold px-3 py-1 rounded-full text-xs">{drug.status}</span>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <div className="flex gap-2">
                          <button className="bg-gray-100 hover:bg-blue-100 text-blue-700 p-2 rounded transition" title="Edit" onClick={() => openEditModal(drugs.indexOf(drug))}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z" /></svg>
                          </button>
                          <button
                            className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded transition"
                            title="Delete"
                            onClick={() => handleDelete(drugs.indexOf(drug))}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Mobile Accordion */}
          <div className="sm:hidden divide-y divide-blue-100">
            {pagedDrugs.length === 0 ? (
              <div className="text-center py-6 text-gray-400">No drugs found.</div>
            ) : (
              pagedDrugs.map((drug, idx) => (
                <details key={drug.name + idx} className="py-3 px-3 group bg-blue-50/30 rounded-lg mb-3 shadow-sm border border-blue-100">
                  <summary className="flex justify-between items-center cursor-pointer font-bold text-blue-900 text-base gap-2">
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate text-base font-bold text-blue-900">{drug.name}</span>
                      <span className="text-xs font-normal text-blue-700 truncate">{drug.manufacturer}</span>
                      <span className="text-xs font-mono text-indigo-700 truncate">{drug.rsi}</span>
                    </div>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${drug.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{drug.status}</span>
                    <span className="ml-3 text-xl text-blue-700 group-open:hidden">+</span>
                    <span className="ml-3 text-xl text-blue-700 hidden group-open:inline">-</span>
                  </summary>
                  <div className="mt-3 text-sm text-blue-900 space-y-2">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-indigo-700">Query:</span>
                      <span className="font-mono break-all text-xs bg-gray-50 rounded px-2 py-1">{drug.query}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-indigo-700">Next Search:</span>
                      <span>{drug.nextSearch ? new Date(drug.nextSearch).toLocaleDateString() : ""}</span>
                    </div>
                    <div className="flex gap-3 mt-2">
                      <button className="flex items-center gap-1 bg-gray-100 hover:bg-blue-100 text-blue-700 px-3 py-1 rounded transition text-xs font-semibold" title="Edit" onClick={() => openEditModal(drugs.indexOf(drug))}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z" /></svg>
                        Edit
                      </button>
                      <button
                        className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1 rounded transition text-xs font-semibold"
                        title="Delete"
                        onClick={() => handleDelete(drugs.indexOf(drug))}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </details>
              ))
            )}
          </div>
          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-6 py-4 border-t border-blue-100 bg-blue-50 rounded-b-xl">
            <div className="text-sm text-gray-600">
              Showing {filteredDrugs.length === 0 ? 0 : (page - 1) * pageSize + 1}
              -{Math.min(page * pageSize, filteredDrugs.length)} of {filteredDrugs.length}
            </div>
            <div className="flex gap-1 items-center">
              <button
                className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 border border-gray-300"
                onClick={() => setPage(1)}
                disabled={page === 1}
                title="First page"
              >&#171;</button>
              <button
                className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 border border-gray-300"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                title="Previous page"
              >&#8249;</button>
              <span className="px-2 text-gray-700 font-semibold">Page {page} of {pageCount || 1}</span>
              <button
                className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 border border-gray-300"
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={page === pageCount || pageCount === 0}
                title="Next page"
              >&#8250;</button>
              <button
                className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 border border-gray-300"
                onClick={() => setPage(pageCount)}
                disabled={page === pageCount || pageCount === 0}
                title="Last page"
              >&#187;</button>
            </div>
          </div>
        </div>

  {/* Modal for Add/Edit Drug */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl shadow-2xl border border-blue-100 w-full max-w-lg relative animate-fade-in flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-6 pt-5 pb-2 border-b border-blue-100">
                <h2 className="text-lg font-black text-blue-900 tracking-wide">{editIndex === null ? 'Add New Drug' : 'Edit Drug'}</h2>
                <button className="text-gray-400 hover:text-blue-600 text-2xl" onClick={closeModal}>&times;</button>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <div>
                  <label className="block text-base font-bold text-indigo-700 mb-2">Drug Name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Aspirin"
                    className={`w-full border-2 rounded-lg px-4 py-2 text-base focus:outline-none transition ${errors.name ? 'border-red-500' : 'border-blue-600 focus:border-blue-800'} bg-white text-blue-900 font-semibold`}
                  />
                  {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
                </div>
                <div>
                  <label className="block text-base font-bold text-indigo-700 mb-2">Query</label>
                  <input
                    name="query"
                    value={form.query}
                    onChange={handleChange}
                    placeholder='e.g. aspirin[tiab] AND ("adverse event"[tiab] OR "side effect"[tiab])'
                    className={`w-full border-2 rounded-lg px-4 py-2 text-base font-mono focus:outline-none transition ${errors.query ? 'border-red-500' : 'border-blue-600 focus:border-blue-800'} bg-white text-blue-900`}
                  />
                  {errors.query && <div className="text-red-500 text-sm mt-1">{errors.query}</div>}
                </div>
                <div>
                  <label className="block text-base font-bold text-indigo-700 mb-2">Manufacturer</label>
                  <input
                    name="manufacturer"
                    value={form.manufacturer}
                    onChange={handleChange}
                    placeholder="e.g. Bayer AG"
                    className={`w-full border-2 rounded-lg px-4 py-2 text-base focus:outline-none transition ${errors.manufacturer ? 'border-red-500' : 'border-blue-600 focus:border-blue-800'} bg-white text-blue-900`}
                  />
                  {errors.manufacturer && <div className="text-red-500 text-sm mt-1">{errors.manufacturer}</div>}
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-base font-bold text-indigo-700 mb-2">RSI</label>
                    <input
                      name="rsi"
                      value={form.rsi}
                      onChange={handleChange}
                      placeholder="e.g. RSI-ASP-001"
                      className={`w-full border-2 rounded-lg px-4 py-2 text-base font-mono focus:outline-none transition ${errors.rsi ? 'border-red-500' : 'border-blue-600 focus:border-blue-800'} bg-white text-blue-900`}
                    />
                    {errors.rsi && <div className="text-red-500 text-sm mt-1">{errors.rsi}</div>}
                  </div>
                  <div className="flex-1">
                    <label className="block text-base font-bold text-indigo-700 mb-2">Next Search</label>
                    <input
                      name="nextSearch"
                      type="date"
                      value={form.nextSearch}
                      onChange={handleChange}
                      placeholder="YYYY-MM-DD"
                      className={`w-full border-2 rounded-lg px-4 py-2 text-base focus:outline-none transition ${errors.nextSearch ? 'border-red-500' : 'border-blue-600 focus:border-blue-800'} bg-white text-blue-900`}
                    />
                    {errors.nextSearch && <div className="text-red-500 text-sm mt-1">{errors.nextSearch}</div>}
                  </div>
                </div>
                <div>
                  <label className="block text-base font-bold text-indigo-700 mb-2">Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full border-2 rounded-lg px-4 py-2 text-base focus:outline-none border-blue-600 focus:border-blue-800 bg-white text-blue-900"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-blue-100 bg-blue-50 rounded-b-xl mt-4">
                  <button type="button" className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold text-base" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 text-base">{editIndex === null ? 'Add' : 'Save'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modal for Delete Confirmation */}
        {deleteIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl shadow-2xl border border-blue-100 w-full max-w-sm relative animate-fade-in flex flex-col">
              <div className="flex items-center justify-between px-6 pt-5 pb-2 border-b border-blue-100">
                <h2 className="text-lg font-black text-red-700 tracking-wide">Confirm Delete</h2>
                <button className="text-gray-400 hover:text-blue-600 text-2xl" onClick={cancelDelete}>&times;</button>
              </div>
              <div className="px-6 py-6 text-blue-900 text-base">
                Are you sure you want to remove <span className="font-bold">{drugs[deleteIndex]?.name}</span> from the database?
              </div>
              <div className="flex justify-end gap-2 px-6 pb-5">
                <button
                  className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold text-base"
                  onClick={cancelDelete}
                >
                  Cancel
                </button>
                <button
                  className="px-5 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 text-base"
                  onClick={confirmDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
// Responsive table styles
// Add this to your global CSS if not already present:
// @media (max-width: 640px) {
//   table, thead, tbody, th, td, tr { display: block; width: 100%; }
//   thead tr { display: none; }
//   td { border: none; position: relative; padding-left: 50%; min-height: 40px; }
//   td:before { position: absolute; left: 0; width: 45%; white-space: nowrap; font-weight: bold; color: #6366f1; }
// }
