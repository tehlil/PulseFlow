import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Bell, ShieldAlert, CheckCheck, Clock, Check } from 'lucide-react';

export default function Notifications() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((res) => res.data.notifications),
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleMarkAsRead = (id: string) => {
    readMutation.mutate(id);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Bell className="w-6 h-6 text-healthcare-rose animate-pulse" />
          <span>Clinical Alert Center</span>
        </h1>
        <p className="text-xs text-primary-muted">Urgent alerts and notification messages regarding clinical charts.</p>
      </div>

      <div className="bg-background-card border border-border rounded-xl shadow-sm overflow-hidden divide-y divide-border/60">
        {isLoading ? (
          <div className="p-8 text-center text-primary-muted animate-pulse">Loading notification alerts...</div>
        ) : error ? (
          <div className="p-6 text-center text-healthcare-rose text-xs">Failed to load notifications.</div>
        ) : !data || data.length === 0 ? (
          <div className="p-16 text-center space-y-2 text-xs text-primary-muted">
            <CheckCheck className="w-8 h-8 text-healthcare-emerald mx-auto" />
            <p>Your inbox is clear. No active alerts flagged.</p>
          </div>
        ) : (
          data.map((n: any) => {
            const isRead = n.read;
            return (
              <div 
                key={n.id} 
                className={`p-5 flex items-start justify-between space-x-4 transition-colors ${
                  isRead ? 'bg-background-card/40' : 'bg-healthcare-rose/5 border-l-2 border-healthcare-rose'
                }`}
              >
                <div className="flex items-start space-x-3 text-xs">
                  <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                    n.type === 'CRITICAL_RISK' ? 'bg-healthcare-rose/10 text-healthcare-rose' : 'bg-healthcare-cyan/10 text-healthcare-cyan'
                  }`}>
                    <ShieldAlert className="w-4.5 h-4.5" />
                  </div>
                  <div className="space-y-1">
                    <p className={`font-bold ${isRead ? 'text-primary-muted' : 'text-white'}`}>{n.title}</p>
                    <p className="text-primary-muted leading-relaxed text-[11px]">{n.message}</p>
                    <div className="flex items-center space-x-1 text-[9px] text-primary-muted pt-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {new Date(n.createdAt).toLocaleDateString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>
                </div>

                {!isRead && (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    className="text-xs text-healthcare-cyan hover:text-white border border-border hover:bg-background-hover px-2.5 py-1 rounded transition-colors inline-flex items-center space-x-1 shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Acknowledge</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
