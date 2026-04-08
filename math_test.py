import numpy as np
import cv2

def order_points(pts):
    pts = pts.reshape(4, 2).astype("float32")
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)
    return np.array([
        pts[np.argmin(s)],
        pts[np.argmin(diff)],
        pts[np.argmax(s)],
        pts[np.argmax(diff)]
    ], dtype="float32")

# Let's say user has a piece of paper on the wall
A4_LONG, A4_SHORT = 29.7, 21.0

# Mock points of A4 paper in photo (slightly perspectively distorted)
paper_pts = np.array([
    [100, 100],  # top left
    [150, 105],  # top right 
    [140, 200],  # bottom right
    [90, 190]    # bottom left
], dtype="float32")

ordered_paper = order_points(paper_pts)
tl, tr, br, bl = ordered_paper

# Determine if portrait or landscape
w1 = np.linalg.norm(tr - tl)
h1 = np.linalg.norm(bl - tl)
if w1 < h1:
    real_w, real_h = A4_SHORT, A4_LONG
else:
    real_w, real_h = A4_LONG, A4_SHORT

dst_pts = np.array([
    [0, 0],
    [real_w, 0],
    [real_w, real_h],
    [0, real_h]
], dtype="float32")

# Calculate Perspective Transform (Homography)
M = cv2.getPerspectiveTransform(ordered_paper, dst_pts)

# User clicks 4 corners of the wall
wall_pts = np.array([
    [50, 50],
    [300, 60],
    [290, 300],
    [40, 280]
], dtype="float32")

# Unwarp the wall points to the real-world scale (cm!)
# perspectiveTransform expects shape (1, N, 2)
real_wall_pts = cv2.perspectiveTransform(wall_pts.reshape(1, 4, 2), M)[0]

# Calculate true widths and heights in cm
wt = np.linalg.norm(real_wall_pts[1] - real_wall_pts[0])
wb = np.linalg.norm(real_wall_pts[2] - real_wall_pts[3])
hl = np.linalg.norm(real_wall_pts[3] - real_wall_pts[0])
hr = np.linalg.norm(real_wall_pts[2] - real_wall_pts[1])

print(f"Wall Width: {wt:.1f} cm (top), {wb:.1f} cm (bottom)")
print(f"Wall Height: {hl:.1f} cm (left), {hr:.1f} cm (right)")

# Average real-world dimensions
print(f"Final: {(wt+wb)/2:.1f} W x {(hl+hr)/2:.1f} H")
