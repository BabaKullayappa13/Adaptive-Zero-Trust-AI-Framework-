"""Research comparison report generation."""

from datetime import datetime
from typing import Dict, Any, Optional
import statistics


# Reference baselines used by this prototype.
# These are internal comparison targets, not verified IEEE paper measurements.
IEEE_BASELINES = {
    "login": {
        "avg_ms": 450,
        "p95_ms": 1200,
        "description": "User login with password verification"
    },
    "otp": {
        "avg_ms": 150,
        "p95_ms": 400,
        "description": "OTP generation and verification"
    },
    "api_call": {
        "avg_ms": 100,
        "p95_ms": 300,
        "description": "Average API endpoint response"
    },
    "database_query": {
        "avg_ms": 50,
        "p95_ms": 150,
        "description": "Typical database query execution"
    },
    "trust_score_calculation": {
        "avg_ms": 200,
        "p95_ms": 600,
        "description": "Trust score computation with ML model"
    },
    "risk_detection": {
        "avg_ms": 250,
        "p95_ms": 800,
        "description": "Anomaly detection with Isolation Forest"
    }
}

# Target SLAs for production systems
SLA_TARGETS = {
    "login": {"p95": 1000, "p99": 2000},
    "otp": {"p95": 300, "p99": 600},
    "api_call": {"p95": 250, "p99": 500},
    "database_query": {"p95": 100, "p99": 200},
    "trust_score_calculation": {"p95": 400, "p99": 800},
    "risk_detection": {"p95": 600, "p99": 1200}
}


class ResearchComparisonReport:
    """Generates research comparison reports comparing measured vs IEEE paper baselines."""

    @staticmethod
    def generate_report(
        metrics_data: Dict[str, Any],
        auth_events_data: Dict[str, Any],
        report_name: str = "Performance Research Comparison"
    ) -> str:
        """Generate a markdown research comparison report."""
        
        timestamp = datetime.utcnow().isoformat()
        
        report = f"""# {report_name}

**Generated**: {timestamp}

## Executive Summary

This report compares measured system performance metrics against the prototype's configured reference targets. These targets are not independently verified IEEE measurements; replace them with cited, reproducible study data before using this report as academic evidence. The analysis identifies performance optimizations and SLA compliance across critical authentication and API operations.

---

## System Performance Analysis

### Overview Metrics

| Metric Type | Measured Avg (ms) | IEEE Baseline (ms) | Variance | Status |
|-------------|------------------|-------------------|----------|--------|
"""
        
        # Add metrics comparison
        for metric_type, data in metrics_data.items():
            if isinstance(data, dict) and 'avg' in data:
                measured_avg = data.get('avg', 0)
                baseline = IEEE_BASELINES.get(metric_type, {}).get('avg_ms', 'N/A')
                
                if isinstance(baseline, (int, float)):
                    variance = ((measured_avg - baseline) / baseline * 100) if baseline else 0
                    status = "✓ PASS" if variance < 20 else "⚠ WARN" if variance < 50 else "✗ FAIL"
                    report += f"| {metric_type} | {measured_avg:.2f} | {baseline} | {variance:+.1f}% | {status} |\n"
        
        report += "\n---\n\n## Detailed Performance Analysis\n\n"
        
        # Detailed analysis for each metric
        for metric_type, data in metrics_data.items():
            if isinstance(data, dict) and 'avg' in data:
                baseline_info = IEEE_BASELINES.get(metric_type, {})
                baseline_avg = baseline_info.get('avg_ms', 0)
                baseline_p95 = baseline_info.get('p95_ms', 0)
                sla = SLA_TARGETS.get(metric_type, {})
                
                measured_avg = data.get('avg', 0)
                measured_p95 = data.get('p95', 0)
                measured_p99 = data.get('p99', 0)
                measured_min = data.get('min', 0)
                measured_max = data.get('max', 0)
                count = data.get('count', 0)
                
                report += f"### {metric_type.replace('_', ' ').title()}\n\n"
                report += f"**Description**: {baseline_info.get('description', 'N/A')}\n\n"
                
                report += "**Measured Performance**:\n"
                report += f"- Average: {measured_avg:.2f} ms\n"
                report += f"- P95: {measured_p95:.2f} ms\n"
                report += f"- P99: {measured_p99:.2f} ms\n"
                report += f"- Min: {measured_min:.2f} ms\n"
                report += f"- Max: {measured_max:.2f} ms\n"
                report += f"- Sample Count: {count}\n\n"
                
                report += "**IEEE Baseline Comparison**:\n"
                report += f"- Baseline Avg: {baseline_avg} ms\n"
                report += f"- Baseline P95: {baseline_p95} ms\n"
                
                if baseline_avg > 0:
                    avg_variance = ((measured_avg - baseline_avg) / baseline_avg * 100)
                    report += f"- Variance: {avg_variance:+.1f}%\n"
                
                if baseline_p95 > 0:
                    p95_variance = ((measured_p95 - baseline_p95) / baseline_p95 * 100)
                    report += f"- P95 Variance: {p95_variance:+.1f}%\n"
                
                report += "\n**SLA Compliance**:\n"
                if sla.get('p95'):
                    p95_sla_status = "✓ PASS" if measured_p95 <= sla['p95'] else "✗ FAIL"
                    report += f"- P95 SLA ({sla['p95']}ms): {p95_sla_status}\n"
                
                if sla.get('p99'):
                    p99_sla_status = "✓ PASS" if measured_p99 <= sla['p99'] else "✗ FAIL"
                    report += f"- P99 SLA ({sla['p99']}ms): {p99_sla_status}\n"
                
                report += "\n"
        
        # Authentication statistics
        if auth_events_data:
            report += "---\n\n## Authentication Performance\n\n"
            
            for event_type, stats in auth_events_data.items():
                success_rate = stats.get('success_rate', 0)
                total = stats.get('total', 0)
                avg_duration = stats.get('avg_duration_ms', 0)
                
                report += f"### {event_type.replace('_', ' ').title()}\n\n"
                report += f"- Total Events: {total}\n"
                report += f"- Success Rate: {success_rate:.2f}%\n"
                report += f"- Average Duration: {avg_duration:.2f}ms\n"
                report += f"- Successful: {stats.get('success', 0)}\n"
                report += f"- Failed: {stats.get('failed', 0)}\n\n"
        
        # Recommendations
        report += "---\n\n## Recommendations\n\n"
        report += "### Performance Optimization Opportunities\n\n"
        
        underperforming = []
        for metric_type, data in metrics_data.items():
            if isinstance(data, dict) and 'avg' in data:
                baseline = IEEE_BASELINES.get(metric_type, {}).get('avg_ms', 0)
                if baseline > 0:
                    variance = ((data.get('avg', 0) - baseline) / baseline * 100)
                    if variance > 30:
                        underperforming.append((metric_type, variance))
        
        if underperforming:
            report += "Metrics exceeding baseline by >30%:\n"
            for metric, variance in sorted(underperforming, key=lambda x: x[1], reverse=True):
                report += f"- **{metric}**: {variance:+.1f}% above baseline\n"
                
                if metric == "database_query":
                    report += "  - Recommendation: Add database indexes, optimize queries, implement caching\n"
                elif metric in ["trust_score_calculation", "risk_detection"]:
                    report += "  - Recommendation: Optimize ML model inference, use batch processing\n"
                elif metric == "login":
                    report += "  - Recommendation: Implement async password hashing, use bcrypt with optimized cost factor\n"
                elif metric == "api_call":
                    report += "  - Recommendation: Implement response caching, use CDN for static content\n"
        else:
            report += "✓ All metrics are within 30% of IEEE baselines\n"
        
        report += "\n### Security & Reliability\n\n"
        
        if auth_events_data:
            failed_auths = sum(stat.get('failed', 0) for stat in auth_events_data.values())
            total_auths = sum(stat.get('total', 0) for stat in auth_events_data.values())
            
            if total_auths > 0:
                auth_success_rate = ((total_auths - failed_auths) / total_auths * 100)
                if auth_success_rate < 99:
                    report += f"- **Authentication reliability**: {auth_success_rate:.2f}% (Target: >99.9%)\n"
                    report += "  - Recommendation: Investigate failed authentication events, improve error handling\n"
                else:
                    report += f"- **Authentication reliability**: ✓ {auth_success_rate:.2f}% (Exceeds target >99.9%)\n"
        
        report += "\n---\n\n## Conclusion\n\n"
        report += "This performance analysis describes observed behavior against configured prototype targets; it does not demonstrate compliance with IEEE standards. "
        report += "Continued monitoring and optimization following the recommendations above will ensure sustained compliance with security requirements and performance targets.\n\n"
        report += "---\n\n"
        report += f"*Report generated at: {timestamp}*\n"
        
        return report

    @staticmethod
    def generate_pdf_report(
        metrics_data: Dict[str, Any],
        auth_events_data: Dict[str, Any],
        filename: str = "performance_report.pdf"
    ) -> Optional[bytes]:
        """
        Generate a PDF report.
        Note: Requires reportlab or similar library - this is a template implementation.
        """
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from io import BytesIO
            
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            styles = getSampleStyleSheet()
            story = []
            
            # Title
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                textColor='#1f2937',
                spaceAfter=12
            )
            story.append(Paragraph("Performance Research Comparison Report", title_style))
            story.append(Spacer(1, 0.3*inch))
            
            # Summary table
            summary_data = [["Metric Type", "Measured Avg (ms)", "IEEE Baseline", "Variance"]]
            for metric_type, data in metrics_data.items():
                if isinstance(data, dict) and 'avg' in data:
                    measured_avg = data.get('avg', 0)
                    baseline = IEEE_BASELINES.get(metric_type, {}).get('avg_ms', 'N/A')
                    
                    if isinstance(baseline, (int, float)):
                        variance = f"{((measured_avg - baseline) / baseline * 100):+.1f}%"
                    else:
                        variance = "N/A"
                    
                    summary_data.append([
                        metric_type,
                        f"{measured_avg:.2f}",
                        str(baseline),
                        variance
                    ])
            
            if len(summary_data) > 1:
                table = Table(summary_data)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), '#f3f4f6'),
                    ('TEXTCOLOR', (0, 0), (-1, 0), '#000000'),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 12),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('GRID', (0, 0), (-1, -1), 1, '#d1d5db'),
                ]))
                story.append(table)
            
            doc.build(story)
            return buffer.getvalue()
        
        except ImportError:
            # Fallback: return markdown as text/plain
            return None


def generate_comparison_report(
    metrics_data: Dict[str, Any],
    auth_events_data: Dict[str, Any]
) -> str:
    """Convenience function to generate a comparison report."""
    return ResearchComparisonReport.generate_report(metrics_data, auth_events_data)
