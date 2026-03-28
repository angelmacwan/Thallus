import sys, ast, os
sys.path.insert(0, '/Users/angel/Documents/Thallus')

os.chdir('/Users/angel/Documents/Thallus')

files = [
    'api/schemas.py',
    'api/routers/metrics.py',
    'api/routers/simulation.py',
    'api/routers/scenarios.py',
    'core/question_metrics.py',
]
ok = True
for f in files:
    try:
        ast.parse(open(f).read())
        print(f'  PASS  {f}')
    except SyntaxError as e:
        print(f'  FAIL  {f}: {e}')
        ok = False

try:
    from api.schemas import QAMetricsFullResponse, EvidenceResponse, QuestionAnswerResponse, MetricsStatusResponse
    print('  PASS  schema imports')
except Exception as e:
    print(f'  FAIL  schema imports: {e}')
    ok = False

metrics_src = open('api/routers/metrics.py').read()
checks = [
    ('MetricsReport' not in metrics_src, 'No stale MetricsReport'),
    ('metrics.json' not in metrics_src, 'No stale metrics.json reference'),
    ('questions_metrics.json' in metrics_src, 'New filename present'),
]
for cond, label in checks:
    if cond:
        print(f'  PASS  {label}')
    else:
        print(f'  FAIL  {label}')
        ok = False

try:
    from core.question_metrics import QuestionMetrics
    qm = QuestionMetrics('/tmp/test')
    print('  PASS  QuestionMetrics instantiation')
except Exception as e:
    print(f'  FAIL  QuestionMetrics: {e}')
    ok = False

print()
print('ALL CHECKS PASSED' if ok else 'SOME CHECKS FAILED')
