/* =========================================================
   CD Engineering — Dashboard Module (Phase 2)
   ========================================================= */
window.APP = window.APP || {};

APP.Dashboard = (function () {
  const S = () => APP.Store;
  let revenueChart = null;
  let statusChart = null;

  function render() {
    const stats = S().getStats();
    const main = document.getElementById('main-content');
    const isAdmin = APP.Auth.isAdmin();

    // Calculate month-over-month revenue trend
    const rev = S().getMonthlyRevenue();
    let trendPct = 0;
    let trendLabel = 'No trend data';
    if (rev.revenue.length >= 2) {
      const curr = rev.revenue[rev.revenue.length - 1];
      const prev = rev.revenue[rev.revenue.length - 2];
      if (prev > 0) {
        trendPct = ((curr - prev) / prev * 100).toFixed(1);
        trendLabel = (trendPct >= 0 ? '+' : '') + trendPct + '% vs last month';
      }
    }
    const trendColor = trendPct >= 0 ? 'var(--success)' : 'var(--danger)';
    const trendArrow = trendPct >= 0
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>';

    // Top 3 customers by revenue
    const customers = S().getCustomers();
    const topCustomers = customers.map(c => {
      const invoices = S().getInvoicesByCustomer(c.id);
      const revenue = invoices.reduce((s, i) => s + (i.total || 0), 0);
      return { ...c, revenue };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 3);

    // Upcoming / pending jobs
    const upcomingJobs = S().getJobs()
      .filter(j => j.status !== 'Completed')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);

    main.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div class="page-header-row">
            <div><h1>Dashboard</h1><p>Overview of your business performance</p></div>
            <button class="btn btn-primary" onclick="APP.Jobs.showModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Job
            </button>
          </div>
        </div>

        <!-- Row 1: Primary KPIs -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div class="kpi-info">
              <h4>Total Jobs</h4>
              <div class="kpi-value" data-count="${stats.totalJobs}">${stats.totalJobs}</div>
              <div class="kpi-sub">${stats.completedJobs} completed</div>
            </div>
          </div>
          ${isAdmin ? `<div class="kpi-card">
            <div class="kpi-icon green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div class="kpi-info">
              <h4>Total Revenue</h4>
              <div class="kpi-value" data-count="${S().formatCurrency(stats.totalRevenue)}">${S().formatCurrency(stats.totalRevenue)}</div>
              <div class="kpi-sub">${S().formatCurrency(stats.paidRevenue)} collected</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
            <div class="kpi-info">
              <h4>Estimated Profit</h4>
              <div class="kpi-value" data-count="${S().formatCurrency(stats.totalProfit)}">${S().formatCurrency(stats.totalProfit)}</div>
              <div class="kpi-sub">From ${stats.totalInvoices} invoices</div>
            </div>
          </div>` : ''}
          <div class="kpi-card">
            <div class="kpi-icon amber">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div class="kpi-info">
              <h4>Pending / Active</h4>
              <div class="kpi-value">${stats.pendingJobs} / ${stats.inProgressJobs}</div>
              <div class="kpi-sub" style="color:${trendColor};display:flex;align-items:center;gap:4px">
                ${trendArrow} ${trendLabel}
              </div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <div class="kpi-info">
              <h4>Fleet Overview</h4>
              <div class="kpi-value">${stats.totalLorries} Lorries</div>
              <div class="kpi-sub">${S().getLorries().filter(l=>l.status==='Active').length} Active Units</div>
            </div>
          </div>
        </div>

        <!-- Charts -->
        <div class="charts-grid">
          <div class="card">
            <div class="card-header"><h3>Monthly Revenue & Profit</h3></div>
            <div class="card-body"><div class="chart-container"><canvas id="revenueChart"></canvas></div></div>
          </div>
          <div class="card">
            <div class="card-header"><h3>Job Status</h3></div>
            <div class="card-body"><div class="chart-container"><canvas id="statusChart"></canvas></div></div>
          </div>
        </div>

        <!-- Bottom Row: Quick Actions + Top Customers + Upcoming Jobs -->
        <div style="display:grid;grid-template-columns:1fr 1.5fr 2fr;gap:20px">
          <div class="card">
            <div class="card-header"><h3>Quick Actions</h3></div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:10px">
              <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="APP.Jobs.showModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New Job
              </button>
              <button class="btn btn-outline" style="width:100%;justify-content:center" onclick="APP.Customers.showModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> Add Customer
              </button>
              <button class="btn btn-outline" style="width:100%;justify-content:center" onclick="APP.Router.navigate('pricing')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Calculate Price
              </button>
            </div>
          </div>

          <!-- Top Customers -->
          <div class="card">
            <div class="card-header">
              <h3>Top Customers</h3>
              <button class="btn btn-outline btn-sm" onclick="APP.Router.navigate('customers')">View All</button>
            </div>
            <div class="card-body compact">
              ${topCustomers.length ? `<table class="data-table"><tbody>
                ${topCustomers.map(c => `<tr><td class="fw-bold">${c.name}</td><td class="text-right text-success">${S().formatCurrency(c.revenue)}</td></tr>`).join('')}
              </tbody></table>` : '<div class="empty-state" style="padding:20px 0"><p>No revenue data</p></div>'}
            </div>
          </div>

          <!-- Revenue By Service -->
          <div class="card">
            <div class="card-header">
              <h3>Revenue By Service</h3>
            </div>
            <div class="card-body compact">
              ${stats.revenueByService && Object.keys(stats.revenueByService).length ? `<table class="data-table"><tbody>
                ${Object.entries(stats.revenueByService).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([srv, rev]) => `<tr><td class="fw-bold">${srv}</td><td class="text-right text-success">${S().formatCurrency(rev)}</td></tr>`).join('')}
              </tbody></table>` : '<div class="empty-state" style="padding:20px 0"><p>No service revenue yet</p></div>'}
            </div>
          </div>
        </div>

        <!-- Upcoming Jobs -->
        <div style="margin-top:20px;">
          <div class="card">
            <div class="card-header">
              <h3>Upcoming Jobs</h3>
              <button class="btn btn-outline btn-sm" onclick="APP.Router.navigate('jobs')">View All</button>
            </div>
            <div class="card-body compact">
              <div class="table-container">${renderUpcomingTable(upcomingJobs)}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    initCharts(stats);
    animateCounters();
  }

  function renderUpcomingTable(jobs) {
    if (!jobs.length) return '<div class="empty-state"><h3>All clear!</h3><p>No pending or active jobs.</p></div>';
    const rows = jobs.map(j => {
      const cust = S().getCustomer(j.customerId);
      const bc = j.status === 'Pending' ? 'badge-pending' : 'badge-inprogress';
      return `<tr class="clickable" onclick="APP.Router.navigate('jobs','detail','${j.id}')">
        <td><strong>${cust ? cust.name : '—'}</strong></td>
        <td>${j.serviceType}</td>
        <td>${S().formatDate(j.date)}</td>
        <td><span class="badge ${bc}"><span class="badge-dot"></span>${j.status}</span></td>
      </tr>`;
    }).join('');
    return `<table class="data-table"><thead><tr><th>Customer</th><th>Service</th><th>Date</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function animateCounters() {
    document.querySelectorAll('.kpi-value[data-count]').forEach(el => {
      const target = el.dataset.count;
      APP.countUp(el, target, 900);
    });
  }

  function initCharts(stats) {
    if (typeof Chart === 'undefined') {
      document.querySelectorAll('.chart-container').forEach(el => {
        el.innerHTML = '<div class="empty-state" style="padding:20px 0"><p>Charts are unavailable. Please check the server vendor files.</p></div>';
      });
      return;
    }

    const rev = S().getMonthlyRevenue();
    const ctx1 = document.getElementById('revenueChart');
    if (ctx1) {
      if (revenueChart) revenueChart.destroy();
      revenueChart = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: rev.labels,
          datasets: [
            {
              label: 'Revenue',
              data: rev.revenue,
              backgroundColor: 'rgba(45, 125, 210, 0.75)',
              borderColor: 'rgba(45, 125, 210, 1)',
              borderWidth: 1, borderRadius: 6, borderSkipped: false,
            },
            {
              label: 'Profit',
              data: rev.profit,
              backgroundColor: 'rgba(16, 185, 129, 0.7)',
              borderColor: 'rgba(16, 185, 129, 1)',
              borderWidth: 1, borderRadius: 6, borderSkipped: false,
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'top', labels: { usePointStyle: true, pointStyleWidth: 10, padding: 16 } } },
          scales: {
            y: { beginAtZero: true, ticks: { callback: v => 'Rs.' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(0,0,0,0.04)' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    const ctx2 = document.getElementById('statusChart');
    if (ctx2) {
      if (statusChart) statusChart.destroy();
      statusChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: ['Pending', 'In Progress', 'Completed'],
          datasets: [{
            data: [stats.pendingJobs, stats.inProgressJobs, stats.completedJobs],
            backgroundColor: ['#f59e0b', '#3b82f6', '#10b981'],
            borderWidth: 0, hoverOffset: 8,
          }]
        },
        options: {
          responsive: true, cutout: '65%',
          plugins: { legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10 } } }
        }
      });
    }
  }

  return { render };
})();
