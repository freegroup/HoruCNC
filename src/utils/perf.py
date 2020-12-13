from time import time
from functools import wraps

def perf_tracker():
    def _perf_tracker(fn):
        @wraps(fn)
        def wrapped_fn(*args, **kwargs):
            start_time = time()

            try:
                result = fn(*args, **kwargs)
            finally:
                elapsed_time = time() - start_time
                # log the result
                print(fn.__name__, '  total_time', elapsed_time)

            return result

        return wrapped_fn
    return _perf_tracker