import vim
import asyncio
import json
import threading
import websockets

class VimConstructor:
    def __init__(self):
        connections = set()

        async def serve_ws(websocket, wat):
            connections.add(websocket)
            await websocket.send(json.dumps(self.state))
            try:
                async for message in websocket:
                    pass
            finally:
                connections.remove(websocket)

        async def ws_main():
            self.thread_loop = asyncio.get_running_loop()
            self.queue = asyncio.Queue(16)
            async with websockets.serve(serve_ws, "127.0.0.1", 8879):
                while True:
                    item = await self.queue.get()
                    if not item:
                        print("over")
                        break
                    for conn in connections.copy():
                        await conn.send(json.dumps({ item: self.state[item] }))

        def thread_main():
            asyncio.run(ws_main())

        self.state = {
                "buf": None,
                "cursor": None,
                }
        self.thread = threading.Thread(target=thread_main, daemon=True)
        self.thread.start()
    def stop(self):
        asyncio.run_coroutine_threadsafe(self.queue.put(None), self.thread_loop).done()
    def set(self, name, value):
        self.state[name] = value
        self.thread_loop.call_soon_threadsafe(asyncio.ensure_future, self.queue.put(name))

try:
    instance.stop()
except:
    pass

instance = VimConstructor()

def CursorMoved():
    # print(dir(vim.current.buffer))
    # start = vim.current.buffer.mark('<')
    # end = int(vim.eval('line2byte(line("\'>"))+col("\'>")'))
    # start = int(vim.eval('line2byte(line("."))+col(".")'))
    # end = start
    instance.set("cursor", int(vim.eval('line2byte(line("."))+col(".")')))

def TextChanged():
    # print(dir(vim.current.buffer))
    # start = vim.current.buffer.mark('<')
    # end = int(vim.eval('line2byte(line("\'>"))+col("\'>")'))
    # start = int(vim.eval('line2byte(line("."))+col(".")'))
    # end = start
    instance.set("text", '\n'.join(vim.current.buffer[:]))
