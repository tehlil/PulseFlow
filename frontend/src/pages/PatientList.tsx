import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Search, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PatientList() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const search = searchParams.get('search') || '';
  const page = searchParams.get('page') || '1';
  const [searchInput, setSearchInput] = useState(search);

  // Sync search input if URL changes
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['patients', search, page],
    queryFn: () => 
      api.get(`/patients?search=${encodeURIComponent(search)}&page=${page}`).then((res) => res.data),
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ search: searchInput, page: '1' });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams({ search, page: newPage.toString() });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Patient Registry</h1>
          <p className="text-xs text-primary-muted">Directory of active clinical patient charts scoped to your hospital.</p>
        </div>
        <Link 
          to="/patients/create" 
          className="bg-white text-background hover:bg-white/90 font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors inline-flex items-center space-x-1.5"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register Patient</span>
        </Link>
      </div>

      {/* 2. Search box */}
      <div className="bg-background-card border border-border p-4 rounded-xl shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-primary-muted absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Search by first name, last name, or MRN..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white focus:outline-none focus:border-border-accent placeholder:text-primary-muted"
            />
          </div>
          <button 
            type="submit"
            className="bg-background-hover hover:bg-border-accent text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shrink-0"
          >
            Search Logs
          </button>
        </form>
      </div>

      {/* 3. Patient Grid Table */}
      <div className="bg-background-card border border-border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 space-y-4 animate-pulse">
            <div className="h-4 bg-border rounded w-1/3" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-border rounded" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-healthcare-rose text-sm">
            An error occurred while retrieving patients data. Please refresh and try again.
          </div>
        ) : !data || data.patients.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <p className="text-sm text-primary-muted">No patient charts match your search filter.</p>
            <Link to="/patients/create" className="text-xs text-healthcare-cyan hover:underline inline-block font-semibold">
              Onboard a new patient record
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-background/25 text-[10px] uppercase font-bold text-primary-muted">
                    <th className="py-3.5 px-6">Name</th>
                    <th className="py-3.5 px-6">MRN (Identifier)</th>
                    <th className="py-3.5 px-6">Gender</th>
                    <th className="py-3.5 px-6">Date of Birth</th>
                    <th className="py-3.5 px-6">Phone Number</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {data.patients.map((p: any) => (
                    <tr key={p.id} className="hover:bg-background-hover/30 transition-colors">
                      <td className="py-4 px-6 font-medium text-white">
                        <Link to={`/patients/${p.id}`} className="hover:underline">
                          {p.firstName} {p.lastName}
                        </Link>
                      </td>
                      <td className="py-4 px-6 font-mono text-primary-muted">{p.mrn}</td>
                      <td className="py-4 px-6 text-white font-medium">{p.gender}</td>
                      <td className="py-4 px-6 text-primary-muted">
                        {new Date(p.dateOfBirth).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </td>
                      <td className="py-4 px-6 text-primary-muted">{p.phone || '—'}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${p.status === 'ACTIVE' ? 'bg-healthcare-emerald/10 text-healthcare-emerald' : 'bg-background/80 text-primary-muted border border-border'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-3">
                        <Link to={`/patients/${p.id}`} className="text-healthcare-cyan hover:underline font-semibold">
                          View Chart
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {data.pagination.totalPages > 1 && (
              <div className="p-4 border-t border-border bg-background/15 flex items-center justify-between text-xs text-primary-muted">
                <span>
                  Showing page {data.pagination.currentPage} of {data.pagination.totalPages}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={data.pagination.currentPage === 1}
                    onClick={() => handlePageChange(data.pagination.currentPage - 1)}
                    className="p-1.5 border border-border hover:bg-background-hover text-white rounded disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={data.pagination.currentPage === data.pagination.totalPages}
                    onClick={() => handlePageChange(data.pagination.currentPage + 1)}
                    className="p-1.5 border border-border hover:bg-background-hover text-white rounded disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
