"""Independent 100-digit reference. Requires mpmath; never installs packages.

This is a differential test oracle, not a proof of arbitrary function bounds.
"""
import json
import math

import mpmath as mp

mp.mp.dps = 100


def number_text(x):
    if math.isinf(x):
        return 'Infinity' if x > 0 else '-Infinity'
    return repr(x)


def bracket(value):
    rounded = float(value)
    if math.isinf(rounded):
        largest = float.fromhex('0x1.fffffffffffffp1023')
        return ([number_text(largest), 'Infinity'] if rounded > 0
                else ['-Infinity', number_text(-largest)])
    exact = mp.mpf(rounded)
    lo = math.nextafter(rounded, -math.inf) if exact > value else rounded
    hi = math.nextafter(rounded, math.inf) if exact < value else rounded
    return [number_text(lo), number_text(hi)]


functions = {
    'sin': (mp.sin, mp.cos),
    'cos': (mp.cos, lambda x: -mp.sin(x)),
    'exp': (mp.exp, mp.exp),
    'ln': (mp.log, lambda x: 1 / x),
    'log': (mp.log10, lambda x: 1 / (x * mp.log(10))),
    'sqrt': (mp.sqrt, lambda x: 1 / (2 * mp.sqrt(x))),
    'sinh': (mp.sinh, mp.cosh),
    'cosh': (mp.cosh, mp.sinh),
    'tanh': (mp.tanh, lambda x: 1 / mp.cosh(x) ** 2),
}
values = [-100., -8., -1., -.125, -1e-12, 0., 1e-12,
          .125, 1., 2., 8., 32., 100.]
points = []
for name, (f, df) in functions.items():
    for x in values:
        if name in ['ln', 'log', 'sqrt'] and x <= 0:
            continue
        t = mp.mpf(x)  # exact binary64 input, not a decimal approximation
        points.append(dict(name=name, x=x, value=bracket(f(t)),
                           derivative=bracket(df(t))))

gaussian = []
for radius in [0.125, 0.5, 1., 2., 4., 8.]:
    probability = mp.erf(mp.mpf(radius) / mp.sqrt(2))
    gaussian.append(dict(radius=radius, probability=bracket(probability),
                         decimal=mp.nstr(probability, 85)))

critical = 1 / mp.log(10)
threshold = critical - mp.log10(critical)
right = 2 - mp.log10(2)

def cdf(x):
    return (1 + mp.erf(x / mp.sqrt(2))) / 2

log_probability = cdf(threshold) + 1 - cdf(right)
log_model = dict(probability=bracket(log_probability),
                 decimal=mp.nstr(log_probability, 85),
                 criticalPoint=mp.nstr(critical, 60))
print(json.dumps(dict(precision=100, points=points, gaussian=gaussian,
                      logModel=log_model), ensure_ascii=False))
