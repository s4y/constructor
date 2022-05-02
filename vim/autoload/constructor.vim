let s:script_folder_path = escape( expand( '<sfile>:p:h' ), '\' )

function! constructor#go(...)
  echo "Go go gadget constructor"
  py3 << EOF
import os.path
from importlib import reload
root_folder = os.path.normpath( os.path.join( vim.eval('s:script_folder_path'), '..' ) )
print("root is", root_folder)
sys.path.append(os.path.join( root_folder, 'python' ))

if 'constructor' in sys.modules:
  reload(constructor)
else:
  import constructor

EOF
endfunction

augroup constructor
    autocmd!
    autocmd CursorMoved * :py3 constructor.CursorMoved()
    autocmd CursorMovedI * :py3 constructor.CursorMoved()
    autocmd TextChanged * :py3 constructor.TextChanged()
    autocmd TextChangedI * :py3 constructor.TextChanged()
    autocmd BufEnter * :py3 constructor.TextChanged()
augroup END  
