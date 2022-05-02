import asyncio
import json
import sys
import threading
import websockets
import websockets.exceptions

sys.path.append('./python-prodj-link')
from prodj.core.prodj import ProDj

loop = asyncio.get_event_loop()
connections = set()

async def send_update(clients, changed_id):
    client = clients[changed_id]
    msg = []
    obj = {
        "id": changed_id,
        "state": client.state,
        "beat_count": client.beat_count,
        "beat": client.beat,
        "pitch": client.actual_pitch,
        "bpm": client.bpm,
        }
    if "sync" in client.state:
        obj["sync"] = True
    if "master" in client.state:
        obj["master"] = True
    if "play" in client.state:
        obj["play"] = True

    msg_str = json.dumps(obj)
    for conn in connections:
        await conn.send(msg_str)

def dj_main():
    p = ProDj()

    def update(id):
        asyncio.run_coroutine_threadsafe(send_update(p.cl.clients, id), loop).result()

    p.set_client_keepalive_callback(update)
    p.set_client_change_callback(update)

    p.start()
    p.vcdj_enable()
    p.join()


dj_thread = threading.Thread(target=dj_main, daemon=True)
dj_thread.start()

async def serve_ws(websocket, wat):
    connections.add(websocket);
    try:
        async for message in websocket:
            pass
    except websockets.exceptions.ConnectionClosedError:
        pass
    finally:
        connections.remove(websocket)

async def main():
    async with websockets.serve(serve_ws, "127.0.0.1", 10505):
        await asyncio.Future()
loop.run_until_complete(main())
