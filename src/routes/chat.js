const express = require('express');
const router = express.Router();
const { getTowers, getDashboardOverview, getAgentInsights } = require('../db');
const { banks } = require('../data');

router.post('/', (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  const msg = message.toLowerCase().trim();
  const towers = getTowers();
  const overview = getDashboardOverview();
  const insights = getAgentInsights();

  const criticalInsights = insights.filter((i) => i.severity === 'CRITICAL');
  const worstTower = towers.reduce(
    (w, t) => (!w || Number(t.currentAvailability) < Number(w.currentAvailability) ? t : w),
    null
  );
  const offlineBanks = banks.filter((b) => !b.connected);
  const highLatencyBanks = banks.filter((b) => b.apiLatencyMs > 350);
  const avgVoice = towers.reduce((s, t) => s + (Number(t.voiceSuccessRate) || 0), 0) / Math.max(1, towers.length);
  const avgData = towers.reduce((s, t) => s + (Number(t.dataSuccessRate) || 0), 0) / Math.max(1, towers.length);
  const avgSms = towers.reduce((s, t) => s + (Number(t.smsSuccessRate) || 0), 0) / Math.max(1, towers.length);

  let reply;

  if (/\b(hello|hi|hey|help|start)\b/.test(msg)) {
    reply =
      `👋 Hi! I'm the Safaricom Network Intelligence Assistant.\n\n` +
      `I have live data on ${towers.length} tower sites across Ethiopia and ${banks.length} bank API connections.\n\n` +
      `You can ask me:\n` +
      `• "What are the current alerts?"\n` +
      `• "How are the banks performing?"\n` +
      `• "Which sites have issues?"\n` +
      `• "Give me an M-Pesa summary"\n` +
      `• "What actions should I take?"`;

  } else if (/\b(critical|alerts?|alarm|incident|emergency)\b/.test(msg)) {
    if (criticalInsights.length === 0) {
      reply =
        `✅ No critical incidents active right now.\n\n` +
        `All ${towers.length} sites are within normal operating parameters. ` +
        `Network-wide GSM availability is ${overview.globalNetworkAvailability}%.`;
    } else {
      reply =
        `⚠️ ${criticalInsights.length} critical incident(s) detected:\n\n` +
        criticalInsights
          .map((i) => {
            const t = towers.find((tw) => tw.id === i.towerId);
            return `📍 ${t?.name || i.towerId} (${t?.region || ''}):\n   ${i.technicalRootCause}\n   → ${i.recommendedAction}`;
          })
          .join('\n\n');
    }

  } else if (/\b(bank|api|gateway|connect|latency|offline)\b/.test(msg)) {
    let parts = [];
    if (offlineBanks.length > 0) {
      parts.push(`🔴 Offline banks (${offlineBanks.length}): ${offlineBanks.map((b) => b.name).join(', ')}`);
    }
    if (highLatencyBanks.length > 0) {
      parts.push(`⚠️ High latency: ${highLatencyBanks.map((b) => `${b.name} (${b.apiLatencyMs}ms)`).join(', ')}`);
    }
    parts.push(
      `\n📊 Full bank status:\n` +
      banks
        .map((b) => {
          const icon = !b.connected ? '🔴' : b.apiLatencyMs > 350 ? '🟡' : '🟢';
          return `${icon} ${b.name}: ${b.successRate.toFixed(1)}% success · ${b.apiLatencyMs}ms${b.incidents > 0 ? ` · ⚠️ ${b.incidents} incident(s)` : ''}`;
        })
        .join('\n')
    );
    reply = parts.join('\n\n');

  } else if (/\b(mpesa|m-pesa|transaction|payment|revenue|money)\b/.test(msg)) {
    const lowMpesa = towers.filter((t) => Number(t.mpesaSuccessRate) < 90);
    reply =
      `💸 M-Pesa Network Summary:\n` +
      `• Success rate: ${overview.mpesaSuccessRate}%\n` +
      `• Revenue at risk: ETB ${overview.totalRevenueAtRisk.toLocaleString()}\n` +
      `• Active users: ${(overview.totalActiveUsers || 0).toLocaleString()}\n\n` +
      (lowMpesa.length > 0
        ? `⚠️ Sites with low M-Pesa success:\n` +
          lowMpesa.map((t) => `• ${t.name}: ${t.mpesaSuccessRate}% (ETB ${Number(t.mpesaFailedAmount).toFixed(0)} failed)`).join('\n')
        : `✅ All M-Pesa flows are healthy across all ${towers.length} sites.`);

  } else if (/\b(voice|call|sms|data|throughput|gsm|service)\b/.test(msg)) {
    const voiceSt = avgVoice >= 97 ? 'Excellent' : avgVoice >= 90 ? 'Good' : avgVoice >= 80 ? 'Warning' : 'Critical';
    const dataSt = avgData >= 97 ? 'Excellent' : avgData >= 90 ? 'Good' : avgData >= 80 ? 'Warning' : 'Critical';
    const smsSt = avgSms >= 97 ? 'Excellent' : avgSms >= 90 ? 'Good' : avgSms >= 80 ? 'Warning' : 'Critical';
    const lowPerf = towers.filter((t) => t.voiceSuccessRate < 92 || t.dataSuccessRate < 92);
    reply =
      `📡 Service Health Across ${towers.length} Sites:\n` +
      `• Voice: ${avgVoice.toFixed(1)}% — ${voiceSt}\n` +
      `• Data: ${avgData.toFixed(1)}% — ${dataSt}\n` +
      `• SMS: ${avgSms.toFixed(1)}% — ${smsSt}\n` +
      `• Avg throughput: ${overview.avgDataThroughputMbps} Mbps\n\n` +
      (lowPerf.length > 0
        ? `⚠️ Underperforming sites:\n` +
          lowPerf.map((t) => `• ${t.name}: Voice ${t.voiceSuccessRate.toFixed(1)}%, Data ${t.dataSuccessRate.toFixed(1)}%`).join('\n')
        : `✅ All services are within SLA.`);

  } else if (/\b(availab|uptime|status|health|network)\b/.test(msg)) {
    reply =
      `📶 Network Health Overview:\n` +
      `• GSM availability: ${overview.globalNetworkAvailability}%\n` +
      `• Total sites: ${overview.towerCount}\n` +
      `• Active users: ${(overview.totalActiveUsers || 0).toLocaleString()}\n` +
      `• Critical alarms: ${overview.activeCriticalAlarms}\n\n` +
      `📍 Lowest availability site:\n• ${worstTower?.name || '—'} (${worstTower?.region || '—'}): ${Number(worstTower?.currentAvailability || 0).toFixed(1)}%`;

  } else if (/\b(worst|lowest|problem|issue|degrad|bad|fail)\b/.test(msg)) {
    const sorted = [...towers].sort((a, b) => Number(a.currentAvailability) - Number(b.currentAvailability)).slice(0, 4);
    reply =
      `🔍 Sites needing immediate attention:\n\n` +
      sorted
        .map(
          (t, i) =>
            `${i + 1}. ${t.name} (${t.region})\n` +
            `   Availability: ${Number(t.currentAvailability).toFixed(1)}% | M-Pesa: ${t.mpesaSuccessRate}%\n` +
            `   ${t.agentInsight?.recommendedAction || 'Continue monitoring.'}`
        )
        .join('\n\n');

  } else if (/\b(region|area|zone|map|coverage)\b/.test(msg)) {
    const regionMap = {};
    towers.forEach((t) => {
      if (!regionMap[t.region]) regionMap[t.region] = [];
      regionMap[t.region].push(t);
    });
    reply =
      `🗺️ Regional Availability (${Object.keys(regionMap).length} regions):\n\n` +
      Object.entries(regionMap)
        .map(([region, ts]) => {
          const avail = ts.reduce((s, t) => s + Number(t.currentAvailability), 0) / ts.length;
          const icon = avail >= 90 ? '🟢' : avail >= 75 ? '🔵' : avail >= 60 ? '🟡' : '🔴';
          return `${icon} ${region}: ${avail.toFixed(1)}% (${ts.length} site${ts.length > 1 ? 's' : ''})`;
        })
        .sort()
        .join('\n');

  } else if (/\b(recommend|action|fix|resolve|what (should|do)|suggest)\b/.test(msg)) {
    if (insights.length === 0) {
      reply = `✅ No immediate actions required. All MCP agents report healthy network conditions.`;
    } else {
      reply =
        `🔧 MCP Agent Recommendations:\n\n` +
        insights
          .slice(0, 5)
          .map((i) => {
            const t = towers.find((tw) => tw.id === i.towerId);
            return `📍 ${t?.name || i.towerId}:\n   ${i.recommendedAction}`;
          })
          .join('\n\n');
    }

  } else if (/\b(users?|active|people|subscriber)\b/.test(msg)) {
    const total = overview.totalActiveUsers || 0;
    const topSites = [...towers].sort((a, b) => (b.activeUsers || 0) - (a.activeUsers || 0)).slice(0, 3);
    reply =
      `👥 Active Users: ${total.toLocaleString()} across all sites\n\n` +
      `Top sites by users:\n` +
      topSites.map((t, i) => `${i + 1}. ${t.name}: ${(t.activeUsers || 0).toLocaleString()} users`).join('\n');

  } else if (/\b(summary|overview|report|dashboard|status)\b/.test(msg)) {
    reply =
      `📊 Full System Summary:\n\n` +
      `🌐 Network: ${overview.globalNetworkAvailability}% availability · ${overview.towerCount} sites\n` +
      `📡 GSM: Voice ${avgVoice.toFixed(1)}% · Data ${avgData.toFixed(1)}% · SMS ${avgSms.toFixed(1)}%\n` +
      `💸 M-Pesa: ${overview.mpesaSuccessRate}% success · ETB ${overview.totalRevenueAtRisk.toLocaleString()} at risk\n` +
      `🔌 Banks: ${banks.filter((b) => b.connected).length}/${banks.length} online\n` +
      `👥 Active Users: ${(overview.totalActiveUsers || 0).toLocaleString()}\n` +
      `⚠️ Critical alarms: ${overview.activeCriticalAlarms}`;

  } else {
    reply =
      `I can help with live network intelligence. Try asking:\n\n` +
      `• "What are the current alerts?"\n` +
      `• "How are banks and APIs performing?"\n` +
      `• "Show M-Pesa performance"\n` +
      `• "Voice and data service health"\n` +
      `• "Which region has the lowest availability?"\n` +
      `• "What actions should I take?"\n` +
      `• "Give me a full summary"`;
  }

  res.json({ reply });
});

module.exports = router;
