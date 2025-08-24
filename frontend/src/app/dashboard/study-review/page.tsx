"use client";
import { useState, useEffect, useRef } from "react";
import { MagnifyingGlassIcon, UserGroupIcon, ExclamationTriangleIcon, ChartBarIcon, ChatBubbleLeftEllipsisIcon } from "@heroicons/react/24/outline";

const studies = [
  {
    pmid: "38901234",
    title: "Long-term cardiovascular effects of aspirin in elderly patients",
    drug: "Aspirin",
    retrieved: "2024-12-01",
    processed: "2024-12-01",
    status: "Pending Review",
    comments: 0,
    classification: { human: true, adverse: true, confidence: "92%" },
    summary:
      "Study involving 500 elderly patients examining cardiovascular outcomes. Reports gastrointestinal bleeding events in 12% of subjects.",
    keyPoints: [
      "Large cohort study (n=500)",
      "Gastrointestinal bleeding observed in 12% of patients",
      "Increased bleeding risk in patients >75 years",
      "Cardiovascular benefits confirmed",
    ],
  },
  {
    pmid: "38901235",
    title: "Metformin-associated lactic acidosis: A systematic review",
    drug: "Metformin",
    retrieved: "2024-12-01",
    processed: "2024-12-01",
    status: "Under Review",
    comments: 1,
    classification: { human: true, adverse: true, confidence: "88%" },
    summary: "Systematic review of metformin use and lactic acidosis cases.",
    keyPoints: [
      "Cases linked to renal impairment",
      "Low incidence but high severity",
      "Recommendations for dose adjustment",
    ],
  },
  {
    pmid: "38901236",
    title: "ACE inhibitor-induced cough: mechanisms and management",
    drug: "Lisinopril",
    retrieved: "2024-11-30",
    processed: "2024-11-30",
    status: "Approved",
    comments: 2,
    classification: { human: true, adverse: false, confidence: "95%" },
    summary: "Review on cough caused by ACE inhibitors and mitigation strategies.",
    keyPoints: [
      "Occurs in ~10% of patients",
      "Switching to ARBs often resolves cough",
      "Mechanism linked to bradykinin accumulation",
    ],
  },
  {
    pmid: "38901237",
    title: "Statin-induced myopathy: clinical manifestations and risk factors",
    drug: "Atorvastatin",
    retrieved: "2024-11-29",
    processed: "2024-11-29",
    status: "Pending Review",
    comments: 0,
    classification: { human: true, adverse: true, confidence: "89%" },
    summary: "Clinical study of muscle-related adverse events in statin users.",
    keyPoints: [
      "Myalgia reported in 8% of patients",
      "Higher risk with higher doses",
      "Recovery after discontinuation",
    ],
  },
  {
    pmid: "38901238",
    title: "Warfarin bleeding complications in atrial fibrillation patients",
    drug: "Warfarin",
    retrieved: "2024-11-28",
    processed: "2024-11-28",
    status: "Under Review",
    comments: 3,
    classification: { human: true, adverse: true, confidence: "94%" },
    summary: "Analysis of bleeding events in warfarin-treated AF patients.",
    keyPoints: [
      "Major bleeding in 3.2% annually",
      "INR monitoring crucial",
      "Age >75 increases risk",
    ],
  },
  {
    pmid: "38901239",
    title: "Antibiotics and Clostridioides difficile infection risk",
    drug: "Clindamycin",
    retrieved: "2024-11-27",
    processed: "2024-11-27",
    status: "Approved",
    comments: 1,
    classification: { human: true, adverse: true, confidence: "96%" },
    summary: "Study on C. diff infections following clindamycin use.",
    keyPoints: [
      "15% developed C. diff colitis",
      "Duration of therapy matters",
      "Elderly patients at higher risk",
    ],
  },
  {
    pmid: "38901240",
    title: "Insulin hypoglycemia in type 2 diabetes management",
    drug: "Insulin",
    retrieved: "2024-11-26",
    processed: "2024-11-26",
    status: "Pending Review",
    comments: 0,
    classification: { human: true, adverse: true, confidence: "91%" },
    summary: "Hypoglycemic events in insulin-treated T2DM patients.",
    keyPoints: [
      "Severe hypoglycemia in 12% of patients",
      "Nocturnal episodes common",
      "Dose adjustment protocols needed",
    ],
  },
  {
    pmid: "38901241",
    title: "Chemotherapy-induced peripheral neuropathy patterns",
    drug: "Cisplatin",
    retrieved: "2024-11-25",
    processed: "2024-11-25",
    status: "Under Review",
    comments: 2,
    classification: { human: true, adverse: true, confidence: "93%" },
    summary: "Neurological complications in cisplatin chemotherapy.",
    keyPoints: [
      "Neuropathy in 85% of patients",
      "Dose-dependent relationship",
      "Permanent in 30% of cases",
    ],
  },
  {
    pmid: "38901242",
    title: "Antidepressant withdrawal syndrome characteristics",
    drug: "Paroxetine",
    retrieved: "2024-11-24",
    processed: "2024-11-24",
    status: "Approved",
    comments: 4,
    classification: { human: true, adverse: true, confidence: "87%" },
    summary: "Withdrawal symptoms following paroxetine discontinuation.",
    keyPoints: [
      "Withdrawal in 78% of patients",
      "Dizziness most common symptom",
      "Gradual tapering recommended",
    ],
  },
  {
    pmid: "38901243",
    title: "Proton pump inhibitor bone fracture risk",
    drug: "Omeprazole",
    retrieved: "2024-11-23",
    processed: "2024-11-23",
    status: "Pending Review",
    comments: 1,
    classification: { human: true, adverse: true, confidence: "85%" },
    summary: "Bone health effects of long-term PPI therapy.",
    keyPoints: [
      "Hip fracture risk increased 1.4x",
      "Calcium absorption impaired",
      "Duration >1 year significant",
    ],
  },
  {
    pmid: "38901244",
    title: "Beta-blocker induced bronchospasm in COPD",
    drug: "Propranolol",
    retrieved: "2024-11-22",
    processed: "2024-11-22",
    status: "Under Review",
    comments: 0,
    classification: { human: true, adverse: true, confidence: "90%" },
    summary: "Respiratory complications in COPD patients on beta-blockers.",
    keyPoints: [
      "Bronchospasm in 22% of patients",
      "FEV1 reduction observed",
      "Cardioselective options preferred",
    ],
  },
  {
    pmid: "38901245",
    title: "Anticoagulant therapy in elderly with multiple comorbidities",
    drug: "Rivaroxaban",
    retrieved: "2024-11-21",
    processed: "2024-11-21",
    status: "Approved",
    comments: 3,
    classification: { human: true, adverse: true, confidence: "88%" },
    summary: "Safety profile of rivaroxaban in complex elderly patients.",
    keyPoints: [
      "Bleeding events in 18% annually",
      "Renal function monitoring critical",
      "Drug interactions frequent",
    ],
  },
  {
    pmid: "38901246",
    title: "Antimalarial retinopathy screening protocols",
    drug: "Hydroxychloroquine",
    retrieved: "2024-11-20",
    processed: "2024-11-20",
    status: "Pending Review",
    comments: 2,
    classification: { human: true, adverse: true, confidence: "92%" },
    summary: "Ocular toxicity monitoring in hydroxychloroquine users.",
    keyPoints: [
      "Retinopathy in 7.5% after 5 years",
      "Annual screening recommended",
      "Irreversible vision changes",
    ],
  },
  {
    pmid: "38901247",
    title: "Fluoroquinolone tendon rupture case series",
    drug: "Ciprofloxacin",
    retrieved: "2024-11-19",
    processed: "2024-11-19",
    status: "Under Review",
    comments: 1,
    classification: { human: true, adverse: true, confidence: "95%" },
    summary: "Tendon complications associated with fluoroquinolone use.",
    keyPoints: [
      "Achilles tendon most affected",
      "Risk higher in elderly",
      "Corticosteroid co-administration increases risk",
    ],
  },
  {
    pmid: "38901248",
    title: "Immunosuppressant infection susceptibility patterns",
    drug: "Methotrexate",
    retrieved: "2024-11-18",
    processed: "2024-11-18",
    status: "Approved",
    comments: 0,
    classification: { human: true, adverse: true, confidence: "89%" },
    summary: "Infection rates in methotrexate-treated patients.",
    keyPoints: [
      "Serious infections in 15% annually",
      "Opportunistic infections observed",
      "Regular monitoring essential",
    ],
  },
  {
    pmid: "38901249",
    title: "Antipsychotic metabolic syndrome development",
    drug: "Olanzapine",
    retrieved: "2024-11-17",
    processed: "2024-11-17",
    status: "Pending Review",
    comments: 2,
    classification: { human: true, adverse: true, confidence: "86%" },
    summary: "Metabolic effects of second-generation antipsychotics.",
    keyPoints: [
      "Weight gain average 12kg",
      "Diabetes risk increased 3x",
      "Lipid profile deterioration",
    ],
  },
  {
    pmid: "38901250",
    title: "Angiotensin receptor blocker hyperkalemia risk",
    drug: "Losartan",
    retrieved: "2024-11-16",
    processed: "2024-11-16",
    status: "Under Review",
    comments: 1,
    classification: { human: true, adverse: true, confidence: "91%" },
    summary: "Electrolyte imbalances with ARB therapy.",
    keyPoints: [
      "Hyperkalemia in 8% of patients",
      "Renal function dependent",
      "Regular K+ monitoring needed",
    ],
  },
  {
    pmid: "38901251",
    title: "Opioid-induced constipation management strategies",
    drug: "Morphine",
    retrieved: "2024-11-15",
    processed: "2024-11-15",
    status: "Approved",
    comments: 3,
    classification: { human: true, adverse: true, confidence: "94%" },
    summary: "Gastrointestinal effects of chronic opioid therapy.",
    keyPoints: [
      "Constipation in 95% of patients",
      "Prophylactic laxatives recommended",
      "Quality of life significantly impacted",
    ],
  },
  {
    pmid: "38901252",
    title: "Antihistamine cognitive impairment in elderly",
    drug: "Diphenhydramine",
    retrieved: "2024-11-14",
    processed: "2024-11-14",
    status: "Pending Review",
    comments: 0,
    classification: { human: true, adverse: true, confidence: "87%" },
    summary: "Cognitive effects of anticholinergic antihistamines.",
    keyPoints: [
      "Memory impairment documented",
      "Fall risk increased",
      "Beers criteria medication",
    ],
  },
  {
    pmid: "38901253",
    title: "Corticosteroid osteoporosis prevention protocols",
    drug: "Prednisone",
    retrieved: "2024-11-13",
    processed: "2024-11-13",
    status: "Under Review",
    comments: 2,
    classification: { human: true, adverse: true, confidence: "93%" },
    summary: "Bone health in long-term corticosteroid users.",
    keyPoints: [
      "Bone density loss 10% annually",
      "Fracture risk doubled",
      "Calcium and vitamin D supplementation",
    ],
  },
  {
    pmid: "38901254",
    title: "Thyroid hormone replacement cardiac effects",
    drug: "Levothyroxine",
    retrieved: "2024-11-12",
    processed: "2024-11-12",
    status: "Approved",
    comments: 1,
    classification: { human: true, adverse: false, confidence: "82%" },
    summary: "Cardiovascular monitoring in thyroid replacement therapy.",
    keyPoints: [
      "Palpitations in 15% of patients",
      "Dose titration important",
      "Elderly require careful monitoring",
    ],
  },
  {
    pmid: "38901255",
    title: "Bisphosphonate atypical fracture patterns",
    drug: "Alendronate",
    retrieved: "2024-11-11",
    processed: "2024-11-11",
    status: "Pending Review",
    comments: 4,
    classification: { human: true, adverse: true, confidence: "90%" },
    summary: "Unusual fracture types in long-term bisphosphonate users.",
    keyPoints: [
      "Atypical femur fractures rare but serious",
      "Prodromal thigh pain common",
      "Drug holidays considered",
    ],
  },
  {
    pmid: "38901256",
    title: "Immunomodulator progressive multifocal leukoencephalopathy",
    drug: "Natalizumab",
    retrieved: "2024-11-10",
    processed: "2024-11-10",
    status: "Under Review",
    comments: 0,
    classification: { human: true, adverse: true, confidence: "97%" },
    summary: "PML risk assessment in multiple sclerosis treatment.",
    keyPoints: [
      "PML incidence 4 per 1000 patients",
      "JC virus testing mandatory",
      "MRI monitoring protocols",
    ],
  },
  {
    pmid: "38901257",
    title: "Antiepileptic drug teratogenicity study",
    drug: "Valproic acid",
    retrieved: "2024-11-09",
    processed: "2024-11-09",
    status: "Approved",
    comments: 2,
    classification: { human: true, adverse: true, confidence: "95%" },
    summary: "Birth defects associated with antiepileptic medications.",
    keyPoints: [
      "Neural tube defects increased 10x",
      "Folic acid supplementation crucial",
      "Alternative agents preferred",
    ],
  },
  {
    pmid: "38901258",
    title: "Antiarrhythmic drug proarrhythmia mechanisms",
    drug: "Amiodarone",
    retrieved: "2024-11-08",
    processed: "2024-11-08",
    status: "Pending Review",
    comments: 1,
    classification: { human: true, adverse: true, confidence: "91%" },
    summary: "Paradoxical arrhythmias from antiarrhythmic therapy.",
    keyPoints: [
      "Torsades de pointes risk",
      "QT interval monitoring essential",
      "Electrolyte balance critical",
    ],
  },
  {
    pmid: "38901259",
    title: "Anticoagulant reversal in emergency situations",
    drug: "Dabigatran",
    retrieved: "2024-11-07",
    processed: "2024-11-07",
    status: "Under Review",
    comments: 3,
    classification: { human: true, adverse: true, confidence: "88%" },
    summary: "Managing bleeding complications with novel anticoagulants.",
    keyPoints: [
      "Reversal agents available",
      "Time-sensitive interventions",
      "Multidisciplinary approach needed",
    ],
  },
  {
    pmid: "38901260",
    title: "Biologic therapy infection screening protocols",
    drug: "Infliximab",
    retrieved: "2024-11-06",
    processed: "2024-11-06",
    status: "Approved",
    comments: 0,
    classification: { human: true, adverse: true, confidence: "92%" },
    summary: "Infectious complications with TNF-alpha inhibitors.",
    keyPoints: [
      "Tuberculosis reactivation risk",
      "Screening before initiation",
      "Regular monitoring required",
    ],
  }
];

const statusStyles: Record<string, string> = {
  "Pending Review": "bg-yellow-100 text-yellow-800 border border-yellow-300",
  "Under Review": "bg-blue-100 text-blue-800 border border-blue-300",
  Approved: "bg-green-100 text-green-800 border border-green-300",
};

export default function StudyReviewPage() {
  // Filter state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedStudy, setSelectedStudy] = useState<typeof studies[0] | null>(null);
  const [comment, setComment] = useState("");
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Filtering logic (works for local and can be replaced with backend call)
  const filteredStudies = studies.filter((study) => {
    // Search by drug name or title
    const matchesSearch =
      search.trim() === "" ||
      study.drug.toLowerCase().includes(search.toLowerCase()) ||
      study.title.toLowerCase().includes(search.toLowerCase());
    // Status filter
    const matchesStatus = status === "" || study.status === status;
    // Date range filter (retrieved date)
    const matchesDateFrom = !dateFrom || study.retrieved >= dateFrom;
    const matchesDateTo = !dateTo || study.retrieved <= dateTo;
    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  // Pagination logic
  const pageCount = Math.ceil(filteredStudies.length / pageSize);
  const paginatedStudies = filteredStudies.slice((page - 1) * pageSize, page * pageSize);

  // When filtered list changes, keep selectedStudy in sync and reset pagination
useEffect(() => {
  if (!filteredStudies.length) {
    setSelectedStudy(null);
    setPage(1);
    return;
  }
  // Do not auto-select any study when filters change
  setPage(1); // Reset to first page when filters change
}, [search, status, dateFrom, dateTo]);

  // Action handlers (to be replaced with backend integration)
  const handleAction = (action: string) => {
    // TODO: Replace with backend call
    alert(`${action} action applied to PMID ${selectedStudy?.pmid}`);
  };

  const handleCommentSubmit = () => {
    if (!comment.trim()) return;
    // TODO: Replace with backend call
    alert(`Comment added to PMID ${selectedStudy?.pmid}: ${comment}`);
    setComment("");
  };

  const detailsRef = useRef<HTMLDivElement>(null);

  // Scroll to details section on mobile when study is selected
  useEffect(() => {
    if (selectedStudy && detailsRef.current && window.innerWidth < 1024) {
      detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedStudy]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-[#101624] dark:to-[#232b3e]">
      {/* Header */}
      <div className="bg-white dark:bg-[#232b3e] border-b border-gray-200 dark:border-blue-900 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-blue-100">Study Review</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-blue-300">Review and manage literature studies for pharmacovigilance</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Filters */}
        <div className="bg-white dark:bg-[#232b3e] rounded-xl shadow-sm border border-gray-200 dark:border-blue-900 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-blue-100 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
            </svg>
            Filter Studies
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-blue-100">Search Studies</label>
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by drug name or title..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-blue-400 dark:border-blue-900 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-[#101624] transition-colors text-gray-900 dark:text-blue-100"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-blue-100">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-4 py-3 border border-blue-400 dark:border-blue-900 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-[#101624] transition-colors text-gray-900 dark:text-blue-100"
              >
                <option value="">All Statuses</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Under Review">Under Review</option>
                <option value="Approved">Approved</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-blue-100">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full px-4 py-3 border border-blue-400 dark:border-blue-900 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-[#101624] transition-colors text-gray-900 dark:text-blue-100"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-blue-100">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full px-4 py-3 border border-blue-400 dark:border-blue-900 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-[#101624] transition-colors text-gray-900 dark:text-blue-100"
              />
            </div>
          </div>
          
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
            className="flex items-center justify-center px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg border border-gray-200 dark:border-blue-900 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
              onClick={() => {
                setSearch("");
                setStatus("");
                setDateFrom("");
                setDateTo("");
                setPage(1);
              }}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear All Filters
            </button>
            <div className="flex items-center text-sm text-gray-600 dark:text-blue-200">
              <span className="font-medium">{filteredStudies.length}</span> studies found
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Studies List */}
          <div className="xl:col-span-1">
            <div className="bg-white dark:bg-[#232b3e] rounded-xl shadow-sm border border-gray-200 dark:border-blue-900 h-full flex flex-col">
              {/* Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-blue-900">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-blue-100 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Studies ({filteredStudies.length})
                  </h3>
                  {filteredStudies.length > 10 && (
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-blue-100">Show:</label>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setPage(1);
                        }}
                        className="border border-blue-400 dark:border-blue-900 rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#101624] focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors text-gray-900 dark:text-blue-100"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Studies List */}
              <div className="flex-1 overflow-y-auto">
                {filteredStudies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                    <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium">No studies found</p>
                    <p className="text-sm mt-1">Try adjusting your search criteria</p>
                  </div>
                ) : (
                  <div className="space-y-3 p-4 sm:p-6">
                    {paginatedStudies.map((study, index) => (
                      <div
                        key={study.pmid}
                        onClick={() => setSelectedStudy(study)}
                        className={`group relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                          selectedStudy && selectedStudy.pmid === study.pmid
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md"
                            : "border-gray-200 dark:border-blue-900 bg-white dark:bg-[#101624] hover:border-blue-300 dark:hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-[#18213a]"
                        }`}
                      >
                        {/* Study Card Content */}
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
                              PMID: {study.pmid}
                            </span>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[study.status]}`}
                            >
                              {study.status}
                            </span>
                          </div>
                          
                          <h4 className="font-semibold text-gray-900 dark:text-blue-100 text-sm leading-tight line-clamp-2">
                            {study.title}
                          </h4>
                          
                          <div className="space-y-1 text-xs text-gray-600 dark:text-blue-200">
                            <div className="flex items-center">
                              <span className="font-medium w-16">Drug:</span>
                              <span className="text-blue-700 dark:text-blue-300 font-medium">{study.drug}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="font-medium w-16">Retrieved:</span>
                              <span>{new Date(study.retrieved).toLocaleDateString('en-CA')}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="font-medium w-16">Comments:</span>
                              <span className="flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                {study.comments}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Selection Indicator */}
                        {selectedStudy && selectedStudy.pmid === study.pmid && (
                          <div className="absolute top-2 right-2">
                            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {pageCount > 1 && (
                <div className="border-t border-gray-200 dark:border-blue-900 px-2 sm:px-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 flex items-center justify-center sm:justify-start text-xs sm:text-sm text-gray-700 dark:text-blue-200">
                      <span>
                        Showing <span className="font-semibold">{((page - 1) * pageSize) + 1}</span> to <span className="font-semibold">{Math.min(page * pageSize, filteredStudies.length)}</span> of <span className="font-semibold">{filteredStudies.length}</span> results
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="flex items-center px-3 py-2 rounded-lg border border-gray-300 dark:border-blue-900 bg-white dark:bg-[#101624] text-gray-700 dark:text-blue-100 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-400 dark:hover:border-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                        aria-label="Previous Page"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-xs sm:text-sm text-gray-700 px-2">
                        Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{pageCount}</span>
                      </span>
                      <button
                        onClick={() => setPage(Math.min(pageCount, page + 1))}
                        disabled={page === pageCount}
                        className="flex items-center px-3 py-2 rounded-lg border border-gray-300 dark:border-blue-900 bg-white dark:bg-[#101624] text-gray-700 dark:text-blue-100 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-400 dark:hover:border-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                        aria-label="Next Page"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Study Details */}
          <div className="xl:col-span-2" ref={detailsRef}>
            <div className="bg-white dark:bg-[#232b3e] rounded-xl shadow-sm border border-gray-200 dark:border-blue-900 h-full flex flex-col">
              {selectedStudy ? (
                <>
                  {/* Header */}
                  <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-blue-900">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-blue-100 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Study Details
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusStyles[selectedStudy.status]}`}> 
                          {selectedStudy.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {/* Basic Information */}
                    <div className="bg-gray-50 dark:bg-[#18213a] rounded-lg p-4 space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-blue-100 mb-3">Study Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-blue-200">PMID:</span>
                          <span className="ml-2 text-blue-700 dark:text-blue-300 font-mono">{selectedStudy.pmid}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-blue-200">Drug:</span>
                          <span className="ml-2 text-gray-900 dark:text-blue-100 font-medium">{selectedStudy.drug}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-blue-200">Retrieved:</span>
                          <span className="ml-2 text-gray-900 dark:text-blue-100">{new Date(selectedStudy.retrieved).toLocaleDateString('en-CA')}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-blue-200">Processed:</span>
                          <span className="ml-2 text-gray-900 dark:text-blue-100">{new Date(selectedStudy.processed).toLocaleDateString('en-CA')}</span>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-blue-200">Title:</span>
                        <p className="mt-1 text-gray-900 dark:text-blue-100 leading-relaxed">{selectedStudy.title}</p>
                      </div>
                    </div>

                    {/* AI Classification */}
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        AI Classification
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                          <UserGroupIcon className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Human Subjects</p>
                            <p className={`text-sm font-semibold ${selectedStudy.classification.human ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}> 
                              {selectedStudy.classification.human ? 'Yes' : 'No'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                          <div>
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Adverse Events</p>
                            <p className={`text-sm font-semibold ${selectedStudy.classification.adverse ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}> 
                              {selectedStudy.classification.adverse ? 'Yes' : 'No'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <ChartBarIcon className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Confidence</p>
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">{selectedStudy.classification.confidence}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-blue-100 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        Summary
                      </h4>
                      <div className="bg-gray-50 dark:bg-[#18213a] rounded-lg p-4">
                        <p className="text-gray-800 dark:text-blue-100 leading-relaxed">{selectedStudy.summary}</p>
                      </div>
                    </div>

                    {/* Key Points */}
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-blue-100 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Key Points
                      </h4>
                      <div className="bg-gray-50 dark:bg-[#18213a] rounded-lg p-4">
                        <ul className="space-y-2">
                          {selectedStudy.keyPoints.map((point, idx) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-gray-800 dark:text-blue-100 leading-relaxed">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="bg-gray-50 dark:bg-[#18213a] rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 dark:text-blue-100 mb-4">Actions</h4>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => handleAction("Approve")}
                          className="flex items-center justify-center px-6 py-3 bg-green-600 dark:bg-green-900 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 font-medium transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Approve Study
                        </button>
                        <button
                          onClick={() => handleAction("Reject")}
                          className="flex items-center justify-center px-6 py-3 bg-red-600 dark:bg-red-900 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 font-medium transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reject Study
                        </button>
                        <button
                          onClick={() => handleAction("Forward")}
                          className="flex items-center justify-center px-6 py-3 bg-blue-600 dark:bg-blue-900 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 font-medium transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Forward Study
                        </button>
                      </div>
                    </div>

                    {/* Comments */}
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-blue-100 mb-3 flex items-center">
                        <ChatBubbleLeftEllipsisIcon className="w-5 h-5 mr-2 text-gray-600 dark:text-blue-200" />
                        Add Comment
                      </h4>
                      <div className="space-y-4">
                        <div className="relative">
                          <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Add your review comments here..."
                            className="w-full px-4 py-3 border border-blue-400 dark:border-blue-900 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 resize-none text-gray-700 dark:text-blue-100 dark:bg-[#101624] transition-colors"
                            rows={4}
                          />
                        </div>
                        <button
                          onClick={handleCommentSubmit}
                          disabled={!comment.trim()}
                          className="flex items-center justify-center px-6 py-3 bg-blue-600 dark:bg-blue-900 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:cursor-not-allowed font-medium transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Submit Comment
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-8">
                  <svg className="w-16 h-16 mb-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-xl font-medium text-gray-900 dark:text-blue-100 mb-2">No Study Selected</h3>
                  <p className="text-gray-600 dark:text-blue-200 text-center max-w-sm">
                    {filteredStudies.length === 0
                      ? 'No studies match your filters. Try adjusting your search criteria.'
                      : 'Select a study from the list on the left to view its details and start your review process.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
