1 256 / =epsilon

# p 0 -0.5 0 vec3 + =p

param'beat 1 mod inv =beat

:def sdTorus { =t =p
 p .xz length t - .x p .y vec2
 length t .y -
 }

:fn transpose 1

:def sceneDistance { =p
  p 0 0 2 vec3 + =p
  # p t 1.1 * rotY 10.2 rotX * transform =p
  # p t rotX transform =p
  p inv_camera_mat transform =p
  p 0 -0.12 0 vec3 + =p
  p t 2 * rotY 0.2 rotZ * transform =p
  # p 0.04 0.001 { p .zxy =p angle } PI / 0.5 + sf * 0.02 + vec2 sdTorus
  p 0.05 0.004 vec2 sdTorus
  }

{

0 0 -1 vec3 =direction

:def marchOnce direction * p + sceneDistance

0 100 vec2
:loop 80 { dup .x =dist .y =best
 dist marchOnce dup dist + swap
 best min
 vec2 }
dup .x =dist .y =best

dist direction * p + marchOnce
=surfDist

best 2 * 0.1 0 ss 1 pow
0.1 0.2 1 hsv *

surfDist 1 0 ss
0 0.0 1 hsv *
+
# dist 2 0 ss *
beat 1 0.5 mix *
draw
}
