import os, time, signal

def exit_process():

    try:
        import psutil
        psutil.Process(os.getpid()).kill()
    except:
        os.kill(os.getpid(), signal.SIGKILL)