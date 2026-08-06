# Performance Monitoring Module

Real-time system performance tracking, analysis, and research comparison against IEEE paper baselines for continuous authentication and zero-trust frameworks.

## Overview

The Performance Monitoring module tracks response times across critical operations:

- **Login Response Time**: User authentication latency
- **OTP Response Time**: One-time password generation and verification
- **API Response Time**: General endpoint response times
- **Database Query Time**: SQL query execution latency
- **Trust Score Calculation Time**: ML model inference for trust scoring
- **Risk Detection Time**: Anomaly detection and risk analysis

## Architecture

### Database Schema

Three main tables store performance data:

#### `performance_metrics`
Stores individual request timings for detailed analysis.

```sql
- id: Primary key
- user_id: Associated user (nullable for system operations)
- metric_type: Type of operation (login, api_call, database_query, etc.)
- endpoint: HTTP endpoint or operation identifier
- duration_ms: Execution time in milliseconds
- status_code: HTTP status or operation result code
- created_at: Timestamp
```

#### `authentication_events`
Records all authentication attempts and outcomes.

```sql
- id: Primary key
- user_id: Associated user
- event_type: login, mfa_verify, password_reset, etc.
- success: Boolean outcome
- mfa_enabled: Whether MFA was used
- duration_ms: Operation latency
- ip_address: Client IP
- created_at: Timestamp
```

#### `metric_aggregates`
Pre-computed hourly/daily statistics for efficient reporting.

```sql
- id: Primary key
- metric_type: Metric being aggregated
- aggregation_period: 'hourly', 'daily', 'weekly'
- period_start, period_end: Time range
- min/max/avg/p95/p99_duration_ms: Statistical measures
- request_count, success_count, error_count: Counters
- created_at: Timestamp
```

### Backend Components

#### `performance_tracker.py`
Core tracking module with key classes:

- **PerformanceTracker**: Records metrics and generates statistics
  - `record_metric()`: Store individual performance readings
  - `record_auth_event()`: Log authentication attempts
  - `get_metrics_summary()`: Calculate min/max/avg/percentiles
  - `get_auth_stats()`: Authentication success rates and duration stats
  - `get_timeseries_data()`: Time-series data for charting

- **timing_decorator**: Decorator for automatic timing of async functions

Usage example:
```python
@timing_decorator(tracker, "trust_score_calculation")
async def calculate_trust_score(user_id: str):
    # Function execution time is automatically tracked
    pass
```

#### `research_report.py`
Comparison report generation against IEEE baselines:

- **IEEE_BASELINES**: Reference performance metrics from academic papers
  - Login: 450ms average, 1200ms P95
  - OTP: 150ms average, 400ms P95
  - API calls: 100ms average, 300ms P95
  - Database queries: 50ms average, 150ms P95
  - Trust scoring: 200ms average, 600ms P95
  - Risk detection: 250ms average, 800ms P95

- **SLA_TARGETS**: Production service level agreements
- **ResearchComparisonReport**: Generates markdown reports with analysis and recommendations

### Frontend Components

#### Admin Performance Dashboard (`/admin/performance`)

Four main tabs:

1. **Overview**
   - RPS (Requests Per Second)
   - Average response time
   - P95 percentile
   - Request count
   - Response time distribution stats

2. **Response Times**
   - Bar chart comparing all metric types
   - Min/Max/Average/P95 distribution

3. **Authentication**
   - Per-event-type statistics
   - Success rates and failure counts
   - Average operation duration

4. **Trends**
   - Time-series charts showing response time over time
   - Request volume timeline

#### Research Report Page (`/admin/research`)

- Displays markdown comparison report
- Compares measured metrics against IEEE baselines
- Shows variance percentages and compliance status
- Lists optimization recommendations
- Exportable as markdown file

## API Endpoints

All admin endpoints require authentication and admin role.

### Summary and Statistics

```
GET /api/admin/metrics/summary?hours=24
```
Response:
```json
{
  "http_request": {
    "min": 10.5,
    "max": 2500.3,
    "avg": 125.7,
    "p95": 450.2,
    "p99": 1200.5,
    "count": 15000
  },
  ...
}
```

### Authentication Statistics

```
GET /api/admin/metrics/auth-stats?hours=24
```
Response:
```json
{
  "login": {
    "total": 1500,
    "success": 1485,
    "failed": 15,
    "success_rate": 99.0,
    "avg_duration_ms": 450.2
  },
  ...
}
```

### Time Series Data

```
GET /api/admin/metrics/timeseries?metric_type=http_request&hours=24
```
Returns array of bucketed statistics (by minute):
```json
[
  {
    "timestamp": "2024-08-06T12:00:00Z",
    "count": 100,
    "avg": 125.5,
    "min": 10.2,
    "max": 500.1
  },
  ...
]
```

### Requests Per Second

```
GET /api/admin/metrics/rps?hours=1
```
Response:
```json
{
  "rps": 16.67,
  "total_requests": 1000,
  "period_hours": 1
}
```

### Export CSV

```
POST /api/admin/metrics/export/csv?metric_type=http_request&hours=24
```
Returns downloadable CSV file with full metric records.

### Research Comparison Report

```
GET /api/admin/metrics/research-report?hours=24
```
Generates markdown report comparing against IEEE baselines:
```json
{
  "report": "# Performance Research Comparison Report\n...",
  "format": "markdown",
  "timestamp": "2024-08-06T12:00:00Z",
  "period_hours": 24
}
```

## Configuration

Set these environment variables:

```env
# Enable/disable performance tracking
ENABLE_PERFORMANCE_TRACKING=true

# Admin user IDs (comma-separated)
ADMIN_USER_IDS=user-id-1,user-id-2
```

## Usage Examples

### Tracking a Function

```python
from performance_tracker import timing_decorator

@timing_decorator(performance_tracker, "my_operation")
async def my_async_function(user_id: str):
    # Implementation
    pass
```

### Recording Custom Metrics

```python
await performance_tracker.record_metric(
    metric_type="custom_operation",
    duration_ms=123.45,
    user_id="user-123",
    endpoint="/api/custom",
    status_code=200
)
```

### Getting Metrics Summary

```python
summary = await performance_tracker.get_metrics_summary(hours=24)
# Returns dict with metric type -> {min, max, avg, p95, p99, count}
```

## IEEE Paper Baseline Comparison

The research report compares your system against established baselines from IEEE papers on continuous authentication and zero-trust frameworks:

- **Target Variance**: <20% above baseline considered acceptable
- **SLA Compliance**: P95 and P99 percentiles must meet configured targets
- **Authentication Reliability**: >99% success rate for all auth operations

## Performance Optimization Recommendations

The system auto-generates recommendations when metrics exceed baselines:

| Metric | Issue | Recommendation |
|--------|-------|-----------------|
| database_query | High latency | Add indexes, optimize queries, implement caching |
| trust_score_calculation | Slow inference | Optimize ML model, use batch processing |
| login | Slow password hashing | Adjust bcrypt cost factor |
| api_call | High response times | Implement response caching, use CDN |

## Monitoring Best Practices

1. **Regular Review**: Check dashboard daily for anomalies
2. **Trend Analysis**: Compare week-over-week and month-over-month trends
3. **SLA Tracking**: Monitor P95/P99 metrics against configured targets
4. **Research Reports**: Generate comparison reports weekly for documentation
5. **Alert Thresholds**: Set up alerts for >30% variance from baseline
6. **Capacity Planning**: Use RPS trends to forecast infrastructure needs

## Data Retention

- Raw metrics: 30 days (configurable)
- Hourly aggregates: 90 days
- Daily aggregates: 1 year
- Research reports: Archived indefinitely

## Troubleshooting

### No metrics appearing in dashboard

1. Verify `performance_tracker` is initialized on app startup
2. Check database tables exist (run migrations)
3. Confirm `ENABLE_PERFORMANCE_TRACKING=true`

### High percentile latencies

1. Check database slow query logs
2. Review ML model inference times
3. Verify network latency to database/external services
4. Check system resource utilization (CPU, memory, disk I/O)

### Admin dashboard access denied

1. Verify user ID is in `ADMIN_USER_IDS` env var
2. Check authentication token is valid
3. Ensure user has current session

## Integration with CI/CD

Generate research reports in CI/CD pipelines to track performance across deployments:

```yaml
- name: Generate Performance Report
  run: |
    curl -H "Authorization: Bearer $ADMIN_TOKEN" \
         "http://localhost:8000/api/admin/metrics/research-report?hours=24" > report.md
```

## References

- IEEE S&P: Continuous Authentication
- IEEE TDSC: Zero Trust Architecture
- NIST SP 800-207: Zero Trust Architecture
