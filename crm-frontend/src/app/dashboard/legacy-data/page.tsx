"use client";

import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { legacyDataService } from '@/services/legacyDataService';
import { toast } from 'react-hot-toast';
import { usePermissions } from "@/components/PermissionProvider";
import { FunnelIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function LegacyDataPage() {
  const { hasPermission } = usePermissions();
  const canAddData = hasPermission('legacyData', 'create');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<{[key: string]: string}>({});
  const [existingData, setExistingData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterTerm, setFilterTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState<{[key: string]: string}>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setOpenFilter(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchData = async () => {
    try {
      const data = await legacyDataService.getData();
      // The backend returns an array of documents with 'data' field.
      // We want to flatten it for display.
      const flattened = data.map((item: any) => item.data);
      setExistingData(flattened);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch legacy data');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      if (data.length > 0) {
        const headers = data[0] as string[];
        setHeaders(headers);
        
        // Initialize mapping with identity (header -> header)
        const initialMapping: {[key: string]: string} = {};
        headers.forEach(h => initialMapping[h] = h);
        setMapping(initialMapping);

        // Parse full data
        const jsonData = XLSX.utils.sheet_to_json(ws);
        setParsedData(jsonData);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleMappingChange = (header: string, value: string) => {
    setMapping(prev => ({ ...prev, [header]: value }));
  };

  const handleSave = async () => {
    if (parsedData.length === 0) return;

    setLoading(true);
    try {
      // Apply mapping
      const mappedData = parsedData.map(row => {
        const newRow: any = {};
        Object.keys(row).forEach(key => {
          if (mapping[key]) {
            newRow[mapping[key]] = row[key];
          }
        });
        return newRow;
      });

      await legacyDataService.uploadData(mappedData);
      toast.success('Data uploaded successfully');
      setFile(null);
      setHeaders([]);
      setParsedData([]);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload data');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to delete all legacy data?')) return;
    
    setLoading(true);
    try {
      await legacyDataService.resetData();
      toast.success('Data reset successfully');
      setExistingData([]);
    } catch (error) {
      console.error(error);
      toast.error('Failed to reset data');
    } finally {
      setLoading(false);
    }
  };

  // Get all unique keys from existing data for table headers
  const tableHeaders = existingData.length > 0 
    ? Array.from(new Set(existingData.flatMap(Object.keys)))
    : [];

  const filteredData = existingData.filter(row => {
    // Global filter
    if (filterTerm) {
      const lowerTerm = filterTerm.toLowerCase();
      const matchesGlobal = Object.values(row).some(val => 
        String(val).toLowerCase().includes(lowerTerm)
      );
      if (!matchesGlobal) return false;
    }

    // Column filters
    return Object.entries(columnFilters).every(([key, value]) => {
      if (!value) return true;
      const cellValue = String(row[key] || '').toLowerCase();
      return cellValue.includes(value.toLowerCase());
    });
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Legacy Data Management</h1>
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Upload New Data</h2>
        {!canAddData ? (
          <p className="text-gray-500">You do not have permission to add legacy data.</p>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-4">
              <input 
                type="file" 
                accept=".csv,.xlsx,.xls" 
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>

            {headers.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium mb-2">Map Columns</h3>
                <div className="grid grid-cols-2 gap-4 max-w-2xl">
                  {headers.map(header => (
                    <div key={header} className="flex items-center gap-2">
                      <span className="w-1/2 text-sm text-gray-600">{header}</span>
                      <span className="text-gray-400">→</span>
                      <input
                        type="text"
                        value={mapping[header] || ''}
                        onChange={(e) => handleMappingChange(header, e.target.value)}
                        className="w-1/2 border rounded px-2 py-1 text-sm"
                        placeholder="Target Field Name"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Set Data'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Current Data ({filteredData.length} records)</h2>
            <input
              type="text"
              placeholder="Filter records..."
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleReset}
            disabled={loading || existingData.length === 0}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            Reset All Data
          </button>
        </div>

        <div className="overflow-x-auto min-h-[500px] border border-gray-100 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                {tableHeaders.map(header => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group whitespace-nowrap">
                    <div className="flex items-center justify-between gap-2">
                       <span>{header}</span>
                       <button 
                         onClick={(e) => {
                             e.stopPropagation();
                             setOpenFilter(openFilter === header ? null : header);
                         }}
                         className={`p-1 rounded hover:bg-gray-200 transition-colors ${columnFilters[header] ? 'text-blue-600 bg-blue-50' : 'text-gray-400 opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
                         title="Filter column"
                       >
                         <FunnelIcon className="w-4 h-4" />
                       </button>
                    </div>
                    {openFilter === header && (
                        <div 
                          ref={filterRef}
                          className="absolute left-0 z-50 mt-2 w-72 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 p-4"
                          style={{ minWidth: 'min-content' }}
                        >
                           <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                              <span className="text-xs font-semibold text-gray-700">Filter by {header}</span>
                              <button onClick={() => setOpenFilter(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                           </div>
                           <div className="relative mb-3">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                               <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                             </div>
                             <input
                                type="text"
                                placeholder={`Search in ${header}...`}
                                value={columnFilters[header] || ''}
                                onChange={(e) => setColumnFilters(prev => ({...prev, [header]: e.target.value}))}
                                className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm"
                                autoFocus
                             />
                           </div>
                           <div className="flex justify-end gap-2">
                             <button
                               onClick={() => setOpenFilter(null)}
                               className="text-xs text-gray-600 px-3 py-1.5 rounded hover:bg-gray-100"
                             >
                               Close
                             </button>
                             <button
                               onClick={() => setColumnFilters(prev => {
                                   const newFilters = {...prev};
                                   delete newFilters[header];
                                   return newFilters;
                               })}
                               className={`text-xs px-3 py-1.5 rounded text-white ${columnFilters[header] ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-300 cursor-not-allowed'}`}
                               disabled={!columnFilters[header]}
                             >
                               Clear Filter
                             </button>
                           </div>
                        </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredData.length > 0 ? (
                filteredData.slice(0, 100).map((row, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30 transition-colors duration-150 group">
                  {tableHeaders.map(header => (
                    <td key={`${idx}-${header}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 group-hover:text-gray-900 border-b border-gray-100 last:border-0">
                      {row[header]?.toString() || '-'}
                    </td>
                  ))}
                </tr>
              ))
              ) : (
                <tr>
                   <td colSpan={tableHeaders.length > 0 ? tableHeaders.length : 1} className="px-6 py-12 text-center text-gray-500 bg-gray-50/50">
                      {existingData.length === 0 ? (
                         <div className="flex flex-col items-center justify-center py-8">
                             <div className="bg-gray-100 p-3 rounded-full mb-3">
                               <FunnelIcon className="h-6 w-6 text-gray-400" />
                             </div>
                             <p className="text-lg font-medium text-gray-900 mb-1">No Records Found</p>
                             <p className="text-sm text-gray-500 max-w-sm">
                               There is no legacy data uploaded yet. Use the upload section above to import your data.
                             </p>
                         </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                           <div className="bg-blue-50 p-3 rounded-full mb-3">
                               <MagnifyingGlassIcon className="h-6 w-6 text-blue-500" />
                           </div>
                           <p className="text-lg font-medium text-gray-900 mb-1">No Matching Records</p>
                           <p className="text-sm text-gray-500 mb-4">
                             No records match your current search criteria.
                           </p>
                           <button 
                             onClick={() => {
                               setFilterTerm('');
                               setColumnFilters({});
                             }}
                             className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                           >
                             Clear all filters
                           </button>
                        </div>
                      )}
                   </td>
                </tr>
              )}
            </tbody>
          </table>
          {filteredData.length > 100 && (
            <div className="p-4 text-center text-gray-500">
              Showing first 100 records of {filteredData.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
