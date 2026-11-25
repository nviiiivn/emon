#!/usr/bin/env python3
"""EMON local-AI bridge, host half (2026-11-20).

The Tower firewall blocks docker containers from reaching the host's Ollama on :11434 and there is no
sudo to open it. A unix socket shared through a bind mount is not subject to the firewall, so:
  container wm-llm :11434  ->  sock/ollama.sock  ->  this relay  ->  127.0.0.1:11436 (ollama-emon.service, the EMON-only Ollama)
Only ever connects to 127.0.0.1:11436.
"""
import asyncio, os

SOCK = os.path.expanduser("~/services/wm-llm/sock/ollama.sock")

async def pipe(r, w):
    try:
        while data := await r.read(65536):
            w.write(data)
            await w.drain()
    except Exception:
        pass
    finally:
        try:
            w.close()
        except Exception:
            pass

async def handle(cr, cw):
    try:
        ur, uw = await asyncio.open_connection("127.0.0.1", 11436)
    except Exception:
        cw.close()
        return
    await asyncio.gather(pipe(cr, uw), pipe(ur, cw))

async def main():
    if os.path.exists(SOCK):
        os.unlink(SOCK)
    srv = await asyncio.start_unix_server(handle, SOCK)
    os.chmod(SOCK, 0o666)
    async with srv:
        await srv.serve_forever()

asyncio.run(main())
