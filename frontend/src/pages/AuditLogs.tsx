import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['auditLogs', page, actionFilter],
    queryFn: () => 
      api.get(`/audit-logs?page=${page}&action=${actionFilter}`).then((res) => res.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <FileSpreadsheet className="w-6 h-6 text-healthcare-cyan" />
            <span>Compliance Audit Trail</span>
          </h1>
          <p className="text-xs text-primary-muted">Audits trail tracking logs on user actions, client updates, and security logs.</p>
        </div>

        {/* Filter select box */}
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="bg-background border border-border text-xs text-white rounded-lg px-3 py-2 focus:outline-none"
        >
          <option value="">All Mutator Actions</option>
          <option value="USER_LOGIN">USER LOGIN</option>
          <option value="TENANT_REGISTER">TENANT REGISTER</option>
          <option value="PATIENT_CREATE">PATIENT CREATE</option>
          <option value="PATIENT_UPDATE">PATIENT UPDATE</option>
          <option value="ASSESSMENT_CREATE">ASSESSMENT CREATE</option>
          <option value="VISIT_CREATE">VISIT CREATE</option>
        </select>
      </div>

      {/* Audit Trails list */}
      <div className="bg-background-card border border-border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-primary-muted animate-pulse">Loading compliance audit logs...</div>
        ) : error ? (
          <div className="p-6 text-center text-healthcare-rose text-xs">
            Insufficient permissions or error loading compliance audit records. Only administrators have access.
          </div>
        ) : !data || data.auditLogs.length === 0 ? (
          <div className="p-12 text-center text-primary-muted text-xs">No audit logs found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-background/25 text-[10px] uppercase font-bold text-primary-muted">
                    <th className="py-3.5 px-6">Timestamp</th>
                    <th className="py-3.5 px-6">Staff Member</th>
                    <th className="py-3.5 px-6">Mutation Action</th>
                    <th className="py-3.5 px-6">Resource Target</th>
                    <th className="py-3.5 px-6">IP Address</th>
                    <th className="py-3.5 px-6">Detail Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {data.auditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-background-hover/30 transition-colors">
                      <td className="py-4 px-6 text-primary-muted font-mono">
                        {new Date(log.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' })}
                      </td>
                      <td className="py-4 px-6 font-medium text-white">
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System Agent'}
                        <p className="text-[10px] text-primary-muted font-mono">{log.user?.email || ''}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className="bg-background px-2.5 py-1 rounded text-[10px] font-bold text-white border border-border">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-primary-muted">{log.resource}</td>
                      <td className="py-4 px-6 font-mono text-primary-muted">{log.ipAddress || '—'}</td>
                      <td className="py-4 px-6 text-primary-muted max-w-xs truncate font-mono text-[10px]">
                        {JSON.stringify(log.metadata)}
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
                    disabled={page === 1}
                    onClick={() => setPage(prev => prev - 1)}
                    className="p-1.5 border border-border hover:bg-background-hover text-white rounded disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page === data.pagination.totalPages}
                    onClick={() => setPage(prev => prev + 1)}
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
