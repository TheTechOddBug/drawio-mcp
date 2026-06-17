// Shared libavoid edge-routing core, used by BOTH delivery mechanisms:
//   - mcp-app-server: inlined into the browser viewer via Function.toString()
//     and run client-side against the live mxGraph model.
//   - mcp-tool-server: imported and run server-side (Node) over parsed XML.
//
// Because it is inlined via toString() it MUST be a single self-contained
// function: no module-scope references, no imports, and NO backticks or `${`
// (it ends up inside mcp-app-server's buildHtml template literal). Keep helpers
// nested. Each consumer does its own substrate-specific extract (vertices/edges
// in absolute coords) and inject (waypoints back as parent-relative points).
//
// libavoid API gotchas baked in here:
//   - Router flag is an integer: RouterFlag.OrthogonalRouting.value
//   - setRoutingParameter takes the enum OBJECT (RoutingParameter.x), not .value
//   - cleanup is router.delete() (embind), not Avoid.destroy()

/**
 * Compute obstacle-avoiding orthogonal routes for a set of edges.
 *
 * @param {object} Avoid - the libavoid instance (AvoidLib.getInstance()).
 * @param {Array<{id:string,x:number,y:number,w:number,h:number}>} vertices
 *        Obstacles, in ABSOLUTE coordinates.
 * @param {Array<{id:string,source:string,target:string}>} edges
 *        Edges referencing vertex ids. Edges whose endpoints aren't both known
 *        vertices are skipped.
 * @param {{shapeBufferDistance?:number,idealNudgingDistance?:number}} [opts]
 * @returns {Object<string, Array<{x:number,y:number}>>} edge id -> interior
 *        bend points (ABSOLUTE, collinear-filtered). The first/last route
 *        points (shape centers) are dropped — endpoints connect at the shape
 *        side midpoint, which is where a floating orthogonalEdgeStyle endpoint
 *        lands anyway. An edge with a straight (bend-free) route maps to [].
 */
export function computeLibavoidRoutes(Avoid, vertices, edges, opts)
{
  var out = {};

  if (Avoid == null || vertices == null || edges == null) return out;

  var buffer = (opts && opts.shapeBufferDistance != null) ? opts.shapeBufferDistance : 16;
  var nudge = (opts && opts.idealNudgingDistance != null) ? opts.idealNudgingDistance : 14;

  function collinear(a, b, c)
  {
    // Zero cross product (1px tolerance) => b lies on segment a..c (redundant).
    return Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) < 1;
  }

  var router = new Avoid.Router(Avoid.RouterFlag.OrthogonalRouting.value);

  // setRoutingParameter wants the enum OBJECT, not its .value (passing the
  // integer silently no-ops and routes run flush against the boxes).
  try { router.setRoutingParameter(Avoid.RoutingParameter.shapeBufferDistance, buffer); } catch (e) {}
  try { router.setRoutingParameter(Avoid.RoutingParameter.idealNudgingDistance, nudge); } catch (e) {}

  var bounds = {};
  var i;

  for (i = 0; i < vertices.length; i++)
  {
    var v = vertices[i];
    if (v == null || v.id == null || !(v.w > 0) || !(v.h > 0)) continue;
    bounds[v.id] = v;
    new Avoid.ShapeRef(router, new Avoid.Rectangle(
      new Avoid.Point(v.x, v.y), new Avoid.Point(v.x + v.w, v.y + v.h)));
  }

  var conns = [];

  for (i = 0; i < edges.length; i++)
  {
    var e = edges[i];
    if (e == null) continue;
    var sb = bounds[e.source];
    var tb = bounds[e.target];
    if (sb == null || tb == null) continue;
    var conn = new Avoid.ConnRef(router,
      new Avoid.ConnEnd(new Avoid.Point(sb.x + sb.w / 2, sb.y + sb.h / 2)),
      new Avoid.ConnEnd(new Avoid.Point(tb.x + tb.w / 2, tb.y + tb.h / 2)));
    conns.push({ id: e.id, conn: conn });
  }

  if (conns.length === 0) { router.delete(); return out; }

  router.processTransaction();

  for (i = 0; i < conns.length; i++)
  {
    var route = conns[i].conn.displayRoute();
    var n = route.size();
    var wps = [];

    if (n >= 2)
    {
      var pts = [];
      var k;
      for (k = 0; k < n; k++) { var p = route.at(k); pts.push({ x: p.x, y: p.y }); }
      for (k = 1; k < n - 1; k++)
      {
        if (collinear(pts[k - 1], pts[k], pts[k + 1])) continue;
        wps.push({ x: Math.round(pts[k].x), y: Math.round(pts[k].y) });
      }
    }

    out[conns[i].id] = wps;
  }

  router.delete();
  return out;
}
