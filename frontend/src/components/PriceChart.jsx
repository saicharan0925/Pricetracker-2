import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area } from 'recharts';

function formatDate(tick) {
  try {
    const d = new Date(tick);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return tick;
  }
}

export default function PriceChart({ data = [], desiredPrice }) {
  const chartData = (Array.isArray(data) ? data : []).map((h) => ({
    date: h.checkedAt || h.checked_at || h.createdAt || h.created_at || h.date,
    label: formatDate(h.checkedAt || h.checked_at || h.createdAt || h.created_at || h.date),
    price: Number(h.price ?? h.currentPrice ?? 0),
  }));

  if (!chartData.length) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-slate-400 glass rounded-2xl">
        No price history yet. Click “Check Now” to record the first data point.
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-3 sm:p-5 h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={70}
            tickFormatter={(v) => '₹' + Number(v).toLocaleString('en-IN', { notation: 'compact' })}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(15,23,42,0.95)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12,
              color: '#f1f5f9',
              fontSize: 13,
            }}
            formatter={(value) => ['₹' + Number(value).toLocaleString('en-IN'), 'Price']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Area type="monotone" dataKey="price" stroke="none" fill="url(#priceFill)" />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#818cf8"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#818cf8', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
          {desiredPrice ? (
            <Line
              type="monotone"
              dataKey={() => Number(desiredPrice)}
              stroke="#10b981"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              dot={false}
              name="Desired"
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
