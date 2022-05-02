
import LinkToPy
import websockets
import time
import asyncio
import json

link = LinkToPy.LinkInterface('./Carbiner')

async def main():
    async with websockets.connect("ws://127.0.0.1:8080/.reserve/ws") as websocket:
        async def send_knob(name, value):
            await websocket.send(json.dumps({
                "name":"broadcast",
                "value":{
                    "type":"knob",
                    "value":{
                        "name":name,
                        "value":value
                        }
                    }
                }))
        async def handle_sync(msg):
            print(msg);
            await send_knob("bpm", link.bpm_)
            await send_knob("downbeat", msg["when"])
        def handle_sync_sync(msg):
            asyncio.run(handle_sync(msg))
        while True:
            link.time_at_beat(0, callback=handle_sync_sync)
            time.sleep(1)


asyncio.run(main())
