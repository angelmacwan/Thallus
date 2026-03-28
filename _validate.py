import sys, ast, os
sys.path.insert(0, '/Users/angel/Documents/Thallus')

files = [
    'api/schemas.py',
    'api/routers/metrics.py',
    'api/routers/simulation.py',
    'api/routers/scenarios.py',
    'core/question_metrics.py',
]
ok = True
for f in files:
    path = os.path.join('/Users/angel/Documents/Thallus', f)
    try:
        ast.parse(open(path).read())
        print(f'  PASS  {f}')
    except SyntaxError as e:
        print(f'  FAIL  {f}: {e}')
        ok = False

from api.schemas import QAMetricsFullResponse, EvidenceResponse, QuestionAnswerResponse, MetricsStatusResponse
print('  PASS  schema imports')

metrics_src = open('/Users/angel/Documents/Thallus/api/routers/metrics.py').read()
assert 'MetricsReport' not in metrics_src, 'Old MetricsReport found!'
assert 'metrics.json' not in metrics_src, 'Old metrics.json found!'
assert 'questions_metrics.json' in metrics_src
print('  PASS  no stale references in metrics router')

from core.question_metrics import QuestionMetrics
qm = QuestionMetrics('/tmp/test')
print('  PASS  QuestionMetrics instantiation')

print()
print('ALL CHECKS PASSED' if ok else 'SOME CHECKS FAILED')
