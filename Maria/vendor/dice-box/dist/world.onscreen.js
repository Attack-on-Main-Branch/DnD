var Yi = Object.defineProperty;
var Qi = (l, e, t) => e in l ? Yi(l, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : l[e] = t;
var We = (l, e, t) => (Qi(l, typeof e != "symbol" ? e + "" : e, t), t), Qt = (l, e, t) => {
  if (!e.has(l))
    throw TypeError("Cannot " + t);
};
var b = (l, e, t) => (Qt(l, e, "read from private field"), t ? t.call(l) : e.get(l)), Ee = (l, e, t) => {
  if (e.has(l))
    throw TypeError("Cannot add the same private member more than once");
  e instanceof WeakSet ? e.add(l) : e.set(l, t);
}, me = (l, e, t, i) => (Qt(l, e, "write to private field"), i ? i.call(l, t) : e.set(l, t), t);
var it = (l, e, t, i) => ({
  set _(r) {
    me(l, e, r, t);
  },
  get _() {
    return b(l, e, i);
  }
}), Ei = (l, e, t) => (Qt(l, e, "access private method"), t);
import { E as Z, O as $, a as oi, M as St, S as xt, C as Et, b as B, V as g, _ as h, c as Se, d as _t, Q as Xe, e as rt, T as G, A as ni, s as mt, f as T, g as Ki, N as gt, h as K, U as Zi, i as ke, j, L as ue, k as ce, l as v, G as Gt, R as Oi, m as z, n as ft, o as _i, p as ji, I as qi, P as Ji, q as pt, r as Fe, t as Te, u as q, v as Je, w as pe, x as C, y as $i, z as k, B as li, F as ne, H as Me, J as er, K as ai, W as Li, X as tr, Y as yt, Z as ir, $ as Di, a0 as M, a1 as Nt, a2 as Pi, a3 as Ot, a4 as rr, a5 as sr, a6 as Ut, a7 as At, a8 as bi, a9 as Ze, aa as Ie, ab as ct, ac as Lt, ad as nr, ae as be, af as Kt, ag as ar, ah as or, ai as lr, D as st } from "./Dice.js";
import { d as mi } from "./dice-box.es.js";
class ye {
  /**
   * Creates a new instance
   * @param externalProperties list of external properties to inject into the object
   */
  constructor(e) {
    if (this._keys = [], this._isDirty = !0, this._areLightsDirty = !0, this._areLightsDisposed = !1, this._areAttributesDirty = !0, this._areTexturesDirty = !0, this._areFresnelDirty = !0, this._areMiscDirty = !0, this._arePrePassDirty = !0, this._areImageProcessingDirty = !0, this._normals = !1, this._uvs = !1, this._needNormals = !1, this._needUVs = !1, this._externalProperties = e, e)
      for (const t in e)
        Object.prototype.hasOwnProperty.call(e, t) && this._setDefaultValue(t);
  }
  /**
   * Specifies if the material needs to be re-calculated
   */
  get isDirty() {
    return this._isDirty;
  }
  /**
   * Marks the material to indicate that it has been re-calculated
   */
  markAsProcessed() {
    this._isDirty = !1, this._areAttributesDirty = !1, this._areTexturesDirty = !1, this._areFresnelDirty = !1, this._areLightsDirty = !1, this._areLightsDisposed = !1, this._areMiscDirty = !1, this._arePrePassDirty = !1, this._areImageProcessingDirty = !1;
  }
  /**
   * Marks the material to indicate that it needs to be re-calculated
   */
  markAsUnprocessed() {
    this._isDirty = !0;
  }
  /**
   * Marks the material to indicate all of its defines need to be re-calculated
   */
  markAllAsDirty() {
    this._areTexturesDirty = !0, this._areAttributesDirty = !0, this._areLightsDirty = !0, this._areFresnelDirty = !0, this._areMiscDirty = !0, this._areImageProcessingDirty = !0, this._isDirty = !0;
  }
  /**
   * Marks the material to indicate that image processing needs to be re-calculated
   */
  markAsImageProcessingDirty() {
    this._areImageProcessingDirty = !0, this._isDirty = !0;
  }
  /**
   * Marks the material to indicate the lights need to be re-calculated
   * @param disposed Defines whether the light is dirty due to dispose or not
   */
  markAsLightDirty(e = !1) {
    this._areLightsDirty = !0, this._areLightsDisposed = this._areLightsDisposed || e, this._isDirty = !0;
  }
  /**
   * Marks the attribute state as changed
   */
  markAsAttributesDirty() {
    this._areAttributesDirty = !0, this._isDirty = !0;
  }
  /**
   * Marks the texture state as changed
   */
  markAsTexturesDirty() {
    this._areTexturesDirty = !0, this._isDirty = !0;
  }
  /**
   * Marks the fresnel state as changed
   */
  markAsFresnelDirty() {
    this._areFresnelDirty = !0, this._isDirty = !0;
  }
  /**
   * Marks the misc state as changed
   */
  markAsMiscDirty() {
    this._areMiscDirty = !0, this._isDirty = !0;
  }
  /**
   * Marks the prepass state as changed
   */
  markAsPrePassDirty() {
    this._arePrePassDirty = !0, this._isDirty = !0;
  }
  /**
   * Rebuilds the material defines
   */
  rebuild() {
    this._keys.length = 0;
    for (const e of Object.keys(this))
      e[0] !== "_" && this._keys.push(e);
    if (this._externalProperties)
      for (const e in this._externalProperties)
        this._keys.indexOf(e) === -1 && this._keys.push(e);
  }
  /**
   * Specifies if two material defines are equal
   * @param other - A material define instance to compare to
   * @returns - Boolean indicating if the material defines are equal (true) or not (false)
   */
  isEqual(e) {
    if (this._keys.length !== e._keys.length)
      return !1;
    for (let t = 0; t < this._keys.length; t++) {
      const i = this._keys[t];
      if (this[i] !== e[i])
        return !1;
    }
    return !0;
  }
  /**
   * Clones this instance's defines to another instance
   * @param other - material defines to clone values to
   */
  cloneTo(e) {
    this._keys.length !== e._keys.length && (e._keys = this._keys.slice(0));
    for (let t = 0; t < this._keys.length; t++) {
      const i = this._keys[t];
      e[i] = this[i];
    }
  }
  /**
   * Resets the material define values
   */
  reset() {
    this._keys.forEach((e) => this._setDefaultValue(e));
  }
  _setDefaultValue(e) {
    var t, i, r, s, n;
    const o = (r = (i = (t = this._externalProperties) === null || t === void 0 ? void 0 : t[e]) === null || i === void 0 ? void 0 : i.type) !== null && r !== void 0 ? r : typeof this[e], a = (n = (s = this._externalProperties) === null || s === void 0 ? void 0 : s[e]) === null || n === void 0 ? void 0 : n.default;
    switch (o) {
      case "number":
        this[e] = a ?? 0;
        break;
      case "string":
        this[e] = a ?? "";
        break;
      default:
        this[e] = a ?? !1;
        break;
    }
  }
  /**
   * Converts the material define values to a string
   * @returns - String of material define information
   */
  toString() {
    let e = "";
    for (let t = 0; t < this._keys.length; t++) {
      const i = this._keys[t], r = this[i];
      switch (typeof r) {
        case "number":
        case "string":
          e += "#define " + i + " " + r + `
`;
          break;
        default:
          r && (e += "#define " + i + `
`);
          break;
      }
    }
    return e;
  }
}
function fr(l) {
  return new Z(l, !0, {
    preserveDrawingBuffer: !0,
    stencil: !0
  });
}
class ze {
  /**
   * Gets a string describing the action executed by the current optimization
   * @returns description string
   */
  getDescription() {
    return "";
  }
  /**
   * This function will be called by the SceneOptimizer when its priority is reached in order to apply the change required by the current optimization
   * @param scene defines the current scene where to apply this optimization
   * @param optimizer defines the current optimizer
   * @returns true if everything that can be done was applied
   */
  apply(e, t) {
    return !0;
  }
  /**
   * Creates the SceneOptimization object
   * @param priority defines the priority of this optimization (0 by default which means first in the list)
   */
  constructor(e = 0) {
    this.priority = e;
  }
}
class Zt extends ze {
  /**
   * Gets a string describing the action executed by the current optimization
   * @returns description string
   */
  getDescription() {
    return "Reducing render target texture size to " + this.maximumSize;
  }
  /**
   * Creates the TextureOptimization object
   * @param priority defines the priority of this optimization (0 by default which means first in the list)
   * @param maximumSize defines the maximum sized allowed for textures (1024 is the default value). If a texture is bigger, it will be scaled down using a factor defined by the step parameter
   * @param step defines the factor (0.5 by default) used to scale down textures bigger than maximum sized allowed.
   */
  constructor(e = 0, t = 1024, i = 0.5) {
    super(e), this.priority = e, this.maximumSize = t, this.step = i;
  }
  /**
   * This function will be called by the SceneOptimizer when its priority is reached in order to apply the change required by the current optimization
   * @param scene defines the current scene where to apply this optimization
   * @param optimizer defines the current optimizer
   * @returns true if everything that can be done was applied
   */
  apply(e, t) {
    let i = !0;
    for (let r = 0; r < e.textures.length; r++) {
      const s = e.textures[r];
      if (!s.canRescale || s.getContext)
        continue;
      const n = s.getSize();
      Math.max(n.width, n.height) > this.maximumSize && (s.scale(this.step), i = !1);
    }
    return i;
  }
}
class pi extends ze {
  /**
   * Gets a string describing the action executed by the current optimization
   * @returns description string
   */
  getDescription() {
    return "Setting hardware scaling level to " + this._currentScale;
  }
  /**
   * Creates the HardwareScalingOptimization object
   * @param priority defines the priority of this optimization (0 by default which means first in the list)
   * @param maximumScale defines the maximum scale to use (2 by default)
   * @param step defines the step to use between two passes (0.5 by default)
   */
  constructor(e = 0, t = 2, i = 0.25) {
    super(e), this.priority = e, this.maximumScale = t, this.step = i, this._currentScale = -1, this._directionOffset = 1;
  }
  /**
   * This function will be called by the SceneOptimizer when its priority is reached in order to apply the change required by the current optimization
   * @param scene defines the current scene where to apply this optimization
   * @param optimizer defines the current optimizer
   * @returns true if everything that can be done was applied
   */
  apply(e, t) {
    return this._currentScale === -1 && (this._currentScale = e.getEngine().getHardwareScalingLevel(), this._currentScale > this.maximumScale && (this._directionOffset = -1)), this._currentScale += this._directionOffset * this.step, e.getEngine().setHardwareScalingLevel(this._currentScale), this._directionOffset === 1 ? this._currentScale >= this.maximumScale : this._currentScale <= this.maximumScale;
  }
}
class jt extends ze {
  /**
   * Gets a string describing the action executed by the current optimization
   * @returns description string
   */
  getDescription() {
    return "Turning shadows on/off";
  }
  /**
   * This function will be called by the SceneOptimizer when its priority is reached in order to apply the change required by the current optimization
   * @param scene defines the current scene where to apply this optimization
   * @param optimizer defines the current optimizer
   * @returns true if everything that can be done was applied
   */
  apply(e, t) {
    return e.shadowsEnabled = t.isInImprovementMode, !0;
  }
}
class qt extends ze {
  /**
   * Gets a string describing the action executed by the current optimization
   * @returns description string
   */
  getDescription() {
    return "Turning post-processes on/off";
  }
  /**
   * This function will be called by the SceneOptimizer when its priority is reached in order to apply the change required by the current optimization
   * @param scene defines the current scene where to apply this optimization
   * @param optimizer defines the current optimizer
   * @returns true if everything that can be done was applied
   */
  apply(e, t) {
    return e.postProcessesEnabled = t.isInImprovementMode, !0;
  }
}
class Jt extends ze {
  /**
   * Gets a string describing the action executed by the current optimization
   * @returns description string
   */
  getDescription() {
    return "Turning lens flares on/off";
  }
  /**
   * This function will be called by the SceneOptimizer when its priority is reached in order to apply the change required by the current optimization
   * @param scene defines the current scene where to apply this optimization
   * @param optimizer defines the current optimizer
   * @returns true if everything that can be done was applied
   */
  apply(e, t) {
    return e.lensFlaresEnabled = t.isInImprovementMode, !0;
  }
}
class cr extends ze {
  /**
   * Gets a string describing the action executed by the current optimization
   * @returns description string
   */
  getDescription() {
    return this.onGetDescription ? this.onGetDescription() : "Running user defined callback";
  }
  /**
   * This function will be called by the SceneOptimizer when its priority is reached in order to apply the change required by the current optimization
   * @param scene defines the current scene where to apply this optimization
   * @param optimizer defines the current optimizer
   * @returns true if everything that can be done was applied
   */
  apply(e, t) {
    return this.onApply ? this.onApply(e, t) : !0;
  }
}
class $t extends ze {
  /**
   * Gets a string describing the action executed by the current optimization
   * @returns description string
   */
  getDescription() {
    return "Turning particles on/off";
  }
  /**
   * This function will be called by the SceneOptimizer when its priority is reached in order to apply the change required by the current optimization
   * @param scene defines the current scene where to apply this optimization
   * @param optimizer defines the current optimizer
   * @returns true if everything that can be done was applied
   */
  apply(e, t) {
    return e.particlesEnabled = t.isInImprovementMode, !0;
  }
}
class Ti extends ze {
  /**
   * Gets a string describing the action executed by the current optimization
   * @returns description string
   */
  getDescription() {
    return "Turning render targets off";
  }
  /**
   * This function will be called by the SceneOptimizer when its priority is reached in order to apply the change required by the current optimization
   * @param scene defines the current scene where to apply this optimization
   * @param optimizer defines the current optimizer
   * @returns true if everything that can be done was applied
   */
  apply(e, t) {
    return e.renderTargetsEnabled = t.isInImprovementMode, !0;
  }
}
class Ke extends ze {
  constructor() {
    super(...arguments), this._canBeMerged = (e) => {
      if (!(e instanceof St))
        return !1;
      const t = e;
      return !(t.isDisposed() || !t.isVisible || !t.isEnabled() || t.instances.length > 0 || t.skeleton || t.hasLODLevels || t.getTotalVertices() === 0);
    };
  }
  /**
   * Gets or sets a boolean which defines if optimization octree has to be updated
   */
  static get UpdateSelectionTree() {
    return Ke._UpdateSelectionTree;
  }
  /**
   * Gets or sets a boolean which defines if optimization octree has to be updated
   */
  static set UpdateSelectionTree(e) {
    Ke._UpdateSelectionTree = e;
  }
  /**
   * Gets a string describing the action executed by the current optimization
   * @returns description string
   */
  getDescription() {
    return "Merging similar meshes together";
  }
  /**
   * This function will be called by the SceneOptimizer when its priority is reached in order to apply the change required by the current optimization
   * @param scene defines the current scene where to apply this optimization
   * @param optimizer defines the current optimizer
   * @param updateSelectionTree defines that the selection octree has to be updated (false by default)
   * @returns true if everything that can be done was applied
   */
  apply(e, t, i) {
    const r = e.meshes.slice(0);
    let s = r.length;
    for (let o = 0; o < s; o++) {
      const a = new Array(), f = r[o];
      if (this._canBeMerged(f)) {
        a.push(f);
        for (let c = o + 1; c < s; c++) {
          const d = r[c];
          this._canBeMerged(d) && d.material === f.material && d.checkCollisions === f.checkCollisions && (a.push(d), s--, r.splice(c, 1), c--);
        }
        a.length < 2 || St.MergeMeshes(a, void 0, !0);
      }
    }
    const n = e;
    return n.createOrUpdateSelectionOctree && (i != null ? i && n.createOrUpdateSelectionOctree() : Ke.UpdateSelectionTree && n.createOrUpdateSelectionOctree()), !0;
  }
}
Ke._UpdateSelectionTree = !1;
class et {
  /**
   * Creates a new list of options used by SceneOptimizer
   * @param targetFrameRate defines the target frame rate to reach (60 by default)
   * @param trackerDuration defines the interval between two checks (2000ms by default)
   */
  constructor(e = 60, t = 2e3) {
    this.targetFrameRate = e, this.trackerDuration = t, this.optimizations = new Array();
  }
  /**
   * Add a new optimization
   * @param optimization defines the SceneOptimization to add to the list of active optimizations
   * @returns the current SceneOptimizerOptions
   */
  addOptimization(e) {
    return this.optimizations.push(e), this;
  }
  /**
   * Add a new custom optimization
   * @param onApply defines the callback called to apply the custom optimization (true if everything that can be done was applied)
   * @param onGetDescription defines the callback called to get the description attached with the optimization.
   * @param priority defines the priority of this optimization (0 by default which means first in the list)
   * @returns the current SceneOptimizerOptions
   */
  addCustomOptimization(e, t, i = 0) {
    const r = new cr(i);
    return r.onApply = e, r.onGetDescription = t, this.optimizations.push(r), this;
  }
  /**
   * Creates a list of pre-defined optimizations aimed to reduce the visual impact on the scene
   * @param targetFrameRate defines the target frame rate (60 by default)
   * @returns a SceneOptimizerOptions object
   */
  static LowDegradationAllowed(e) {
    const t = new et(e);
    let i = 0;
    return t.addOptimization(new Ke(i)), t.addOptimization(new jt(i)), t.addOptimization(new Jt(i)), i++, t.addOptimization(new qt(i)), t.addOptimization(new $t(i)), i++, t.addOptimization(new Zt(i, 1024)), t;
  }
  /**
   * Creates a list of pre-defined optimizations aimed to have a moderate impact on the scene visual
   * @param targetFrameRate defines the target frame rate (60 by default)
   * @returns a SceneOptimizerOptions object
   */
  static ModerateDegradationAllowed(e) {
    const t = new et(e);
    let i = 0;
    return t.addOptimization(new Ke(i)), t.addOptimization(new jt(i)), t.addOptimization(new Jt(i)), i++, t.addOptimization(new qt(i)), t.addOptimization(new $t(i)), i++, t.addOptimization(new Zt(i, 512)), i++, t.addOptimization(new Ti(i)), i++, t.addOptimization(new pi(i, 2)), t;
  }
  /**
   * Creates a list of pre-defined optimizations aimed to have a big impact on the scene visual
   * @param targetFrameRate defines the target frame rate (60 by default)
   * @returns a SceneOptimizerOptions object
   */
  static HighDegradationAllowed(e) {
    const t = new et(e);
    let i = 0;
    return t.addOptimization(new Ke(i)), t.addOptimization(new jt(i)), t.addOptimization(new Jt(i)), i++, t.addOptimization(new qt(i)), t.addOptimization(new $t(i)), i++, t.addOptimization(new Zt(i, 256)), i++, t.addOptimization(new Ti(i)), i++, t.addOptimization(new pi(i, 4)), t;
  }
}
class fi {
  /**
   * Gets or sets a boolean indicating if the optimizer is in improvement mode
   */
  get isInImprovementMode() {
    return this._improvementMode;
  }
  set isInImprovementMode(e) {
    this._improvementMode = e;
  }
  /**
   * Gets the current priority level (0 at start)
   */
  get currentPriorityLevel() {
    return this._currentPriorityLevel;
  }
  /**
   * Gets the current frame rate checked by the SceneOptimizer
   */
  get currentFrameRate() {
    return this._currentFrameRate;
  }
  /**
   * Gets or sets the current target frame rate (60 by default)
   */
  get targetFrameRate() {
    return this._targetFrameRate;
  }
  /**
   * Gets or sets the current target frame rate (60 by default)
   */
  set targetFrameRate(e) {
    this._targetFrameRate = e;
  }
  /**
   * Gets or sets the current interval between two checks (every 2000ms by default)
   */
  get trackerDuration() {
    return this._trackerDuration;
  }
  /**
   * Gets or sets the current interval between two checks (every 2000ms by default)
   */
  set trackerDuration(e) {
    this._trackerDuration = e;
  }
  /**
   * Gets the list of active optimizations
   */
  get optimizations() {
    return this._options.optimizations;
  }
  /**
   * Creates a new SceneOptimizer
   * @param scene defines the scene to work on
   * @param options defines the options to use with the SceneOptimizer
   * @param autoGeneratePriorities defines if priorities must be generated and not read from SceneOptimization property (true by default)
   * @param improvementMode defines if the scene optimizer must run the maximum optimization while staying over a target frame instead of trying to reach the target framerate (false by default)
   */
  constructor(e, t, i = !0, r = !1) {
    if (this._isRunning = !1, this._currentPriorityLevel = 0, this._targetFrameRate = 60, this._trackerDuration = 2e3, this._currentFrameRate = 0, this._improvementMode = !1, this.onSuccessObservable = new $(), this.onNewOptimizationAppliedObservable = new $(), this.onFailureObservable = new $(), t ? this._options = t : this._options = new et(), this._options.targetFrameRate && (this._targetFrameRate = this._options.targetFrameRate), this._options.trackerDuration && (this._trackerDuration = this._options.trackerDuration), i) {
      let s = 0;
      for (const n of this._options.optimizations)
        n.priority = s++;
    }
    this._improvementMode = r, this._scene = e || oi.LastCreatedScene, this._sceneDisposeObserver = this._scene.onDisposeObservable.add(() => {
      this._sceneDisposeObserver = null, this.dispose();
    });
  }
  /**
   * Stops the current optimizer
   */
  stop() {
    this._isRunning = !1;
  }
  /**
   * Reset the optimizer to initial step (current priority level = 0)
   */
  reset() {
    this._currentPriorityLevel = 0;
  }
  /**
   * Start the optimizer. By default it will try to reach a specific framerate
   * but if the optimizer is set with improvementMode === true then it will run all optimization while frame rate is above the target frame rate
   */
  start() {
    this._isRunning || (this._isRunning = !0, this._scene.executeWhenReady(() => {
      setTimeout(() => {
        this._checkCurrentState();
      }, this._trackerDuration);
    }));
  }
  _checkCurrentState() {
    if (!this._isRunning)
      return;
    const e = this._scene, t = this._options;
    if (this._currentFrameRate = Math.round(e.getEngine().getFps()), this._improvementMode && this._currentFrameRate <= this._targetFrameRate || !this._improvementMode && this._currentFrameRate >= this._targetFrameRate) {
      this._isRunning = !1, this.onSuccessObservable.notifyObservers(this);
      return;
    }
    let i = !0, r = !0;
    for (let s = 0; s < t.optimizations.length; s++) {
      const n = t.optimizations[s];
      n.priority === this._currentPriorityLevel && (r = !1, i = i && n.apply(e, this), this.onNewOptimizationAppliedObservable.notifyObservers(n));
    }
    if (r) {
      this._isRunning = !1, this.onFailureObservable.notifyObservers(this);
      return;
    }
    i && this._currentPriorityLevel++, e.executeWhenReady(() => {
      setTimeout(() => {
        this._checkCurrentState();
      }, this._trackerDuration);
    });
  }
  /**
   * Release all resources
   */
  dispose() {
    this.stop(), this.onSuccessObservable.clear(), this.onFailureObservable.clear(), this.onNewOptimizationAppliedObservable.clear(), this._sceneDisposeObserver && this._scene.onDisposeObservable.remove(this._sceneDisposeObserver);
  }
  /**
   * Helper function to create a SceneOptimizer with one single line of code
   * @param scene defines the scene to work on
   * @param options defines the options to use with the SceneOptimizer
   * @param onSuccess defines a callback to call on success
   * @param onFailure defines a callback to call on failure
   * @returns the new SceneOptimizer object
   */
  static OptimizeAsync(e, t, i, r) {
    const s = new fi(e, t || et.ModerateDegradationAllowed(), !1);
    return i && s.onSuccessObservable.add(() => {
      i();
    }), r && s.onFailureObservable.add(() => {
      r();
    }), s.start(), s;
  }
}
function dr(l) {
  const { engine: e } = l, t = new xt(e);
  t.clearColor = new Et(0, 0, 0, 0), t.pointerMovePredicate = () => !1, t.pointerDownPredicate = () => !1, t.pointerUpPredicate = () => !1, t.clearCachedVertexData(), t.themeData = {};
  const i = et.LowDegradationAllowed();
  return i.optimizations = i.optimizations.splice(1), i.targetFrameRate = 60, fi.OptimizeAsync(t, i), t;
}
class se extends Se {
  /**
   * Instantiates a target camera that takes a mesh or position as a target and continues to look at it while it moves.
   * This is the base of the follow, arc rotate cameras and Free camera
   * @see https://doc.babylonjs.com/features/featuresDeepDive/cameras
   * @param name Defines the name of the camera in the scene
   * @param position Defines the start position of the camera in the scene
   * @param scene Defines the scene the camera belongs to
   * @param setActiveOnSceneIfNoneActive Defines whether the camera should be marked as active if not other active cameras have been defined
   */
  constructor(e, t, i, r = !0) {
    super(e, t, i, r), this._tmpUpVector = g.Zero(), this._tmpTargetVector = g.Zero(), this.cameraDirection = new g(0, 0, 0), this.cameraRotation = new _t(0, 0), this.ignoreParentScaling = !1, this.updateUpVectorFromRotation = !1, this._tmpQuaternion = new Xe(), this.rotation = new g(0, 0, 0), this.speed = 2, this.noRotationConstraint = !1, this.invertRotation = !1, this.inverseRotationSpeed = 0.2, this.lockedTarget = null, this._currentTarget = g.Zero(), this._initialFocalDistance = 1, this._viewMatrix = B.Zero(), this._camMatrix = B.Zero(), this._cameraTransformMatrix = B.Zero(), this._cameraRotationMatrix = B.Zero(), this._referencePoint = new g(0, 0, 1), this._transformedReferencePoint = g.Zero(), this._defaultUp = g.Up(), this._cachedRotationZ = 0, this._cachedQuaternionRotationZ = 0;
  }
  /**
   * Gets the position in front of the camera at a given distance.
   * @param distance The distance from the camera we want the position to be
   * @returns the position
   */
  getFrontPosition(e) {
    this.getWorldMatrix();
    const t = this.getTarget().subtract(this.position);
    return t.normalize(), t.scaleInPlace(e), this.globalPosition.add(t);
  }
  /** @internal */
  _getLockedTargetPosition() {
    if (!this.lockedTarget)
      return null;
    if (this.lockedTarget.absolutePosition) {
      const e = this.lockedTarget;
      e.computeWorldMatrix().getTranslationToRef(e.absolutePosition);
    }
    return this.lockedTarget.absolutePosition || this.lockedTarget;
  }
  /**
   * Store current camera state of the camera (fov, position, rotation, etc..)
   * @returns the camera
   */
  storeState() {
    return this._storedPosition = this.position.clone(), this._storedRotation = this.rotation.clone(), this.rotationQuaternion && (this._storedRotationQuaternion = this.rotationQuaternion.clone()), super.storeState();
  }
  /**
   * Restored camera state. You must call storeState() first
   * @returns whether it was successful or not
   * @internal
   */
  _restoreStateValues() {
    return super._restoreStateValues() ? (this.position = this._storedPosition.clone(), this.rotation = this._storedRotation.clone(), this.rotationQuaternion && (this.rotationQuaternion = this._storedRotationQuaternion.clone()), this.cameraDirection.copyFromFloats(0, 0, 0), this.cameraRotation.copyFromFloats(0, 0), !0) : !1;
  }
  /** @internal */
  _initCache() {
    super._initCache(), this._cache.lockedTarget = new g(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE), this._cache.rotation = new g(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE), this._cache.rotationQuaternion = new Xe(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
  }
  /**
   * @internal
   */
  _updateCache(e) {
    e || super._updateCache();
    const t = this._getLockedTargetPosition();
    t ? this._cache.lockedTarget ? this._cache.lockedTarget.copyFrom(t) : this._cache.lockedTarget = t.clone() : this._cache.lockedTarget = null, this._cache.rotation.copyFrom(this.rotation), this.rotationQuaternion && this._cache.rotationQuaternion.copyFrom(this.rotationQuaternion);
  }
  // Synchronized
  /** @internal */
  _isSynchronizedViewMatrix() {
    if (!super._isSynchronizedViewMatrix())
      return !1;
    const e = this._getLockedTargetPosition();
    return (this._cache.lockedTarget ? this._cache.lockedTarget.equals(e) : !e) && (this.rotationQuaternion ? this.rotationQuaternion.equals(this._cache.rotationQuaternion) : this._cache.rotation.equals(this.rotation));
  }
  // Methods
  /** @internal */
  _computeLocalCameraSpeed() {
    const e = this.getEngine();
    return this.speed * Math.sqrt(e.getDeltaTime() / (e.getFps() * 100));
  }
  // Target
  /**
   * Defines the target the camera should look at.
   * @param target Defines the new target as a Vector
   */
  setTarget(e) {
    this.upVector.normalize(), this._initialFocalDistance = e.subtract(this.position).length(), this.position.z === e.z && (this.position.z += rt), this._referencePoint.normalize().scaleInPlace(this._initialFocalDistance), B.LookAtLHToRef(this.position, e, this._defaultUp, this._camMatrix), this._camMatrix.invert(), this.rotation.x = Math.atan(this._camMatrix.m[6] / this._camMatrix.m[10]);
    const t = e.subtract(this.position);
    t.x >= 0 ? this.rotation.y = -Math.atan(t.z / t.x) + Math.PI / 2 : this.rotation.y = -Math.atan(t.z / t.x) - Math.PI / 2, this.rotation.z = 0, isNaN(this.rotation.x) && (this.rotation.x = 0), isNaN(this.rotation.y) && (this.rotation.y = 0), isNaN(this.rotation.z) && (this.rotation.z = 0), this.rotationQuaternion && Xe.RotationYawPitchRollToRef(this.rotation.y, this.rotation.x, this.rotation.z, this.rotationQuaternion);
  }
  /**
   * Defines the target point of the camera.
   * The camera looks towards it form the radius distance.
   */
  get target() {
    return this.getTarget();
  }
  set target(e) {
    this.setTarget(e);
  }
  /**
   * Return the current target position of the camera. This value is expressed in local space.
   * @returns the target position
   */
  getTarget() {
    return this._currentTarget;
  }
  /** @internal */
  _decideIfNeedsToMove() {
    return Math.abs(this.cameraDirection.x) > 0 || Math.abs(this.cameraDirection.y) > 0 || Math.abs(this.cameraDirection.z) > 0;
  }
  /** @internal */
  _updatePosition() {
    if (this.parent) {
      this.parent.getWorldMatrix().invertToRef(G.Matrix[0]), g.TransformNormalToRef(this.cameraDirection, G.Matrix[0], G.Vector3[0]), this.position.addInPlace(G.Vector3[0]);
      return;
    }
    this.position.addInPlace(this.cameraDirection);
  }
  /** @internal */
  _checkInputs() {
    const e = this.invertRotation ? -this.inverseRotationSpeed : 1, t = this._decideIfNeedsToMove(), i = Math.abs(this.cameraRotation.x) > 0 || Math.abs(this.cameraRotation.y) > 0;
    t && this._updatePosition(), i && (this.rotationQuaternion && this.rotationQuaternion.toEulerAnglesToRef(this.rotation), this.rotation.x += this.cameraRotation.x * e, this.rotation.y += this.cameraRotation.y * e, this.noRotationConstraint || (this.rotation.x > 1.570796 && (this.rotation.x = 1.570796), this.rotation.x < -1.570796 && (this.rotation.x = -1.570796)), this.rotationQuaternion && this.rotation.lengthSquared() && Xe.RotationYawPitchRollToRef(this.rotation.y, this.rotation.x, this.rotation.z, this.rotationQuaternion)), t && (Math.abs(this.cameraDirection.x) < this.speed * rt && (this.cameraDirection.x = 0), Math.abs(this.cameraDirection.y) < this.speed * rt && (this.cameraDirection.y = 0), Math.abs(this.cameraDirection.z) < this.speed * rt && (this.cameraDirection.z = 0), this.cameraDirection.scaleInPlace(this.inertia)), i && (Math.abs(this.cameraRotation.x) < this.speed * rt && (this.cameraRotation.x = 0), Math.abs(this.cameraRotation.y) < this.speed * rt && (this.cameraRotation.y = 0), this.cameraRotation.scaleInPlace(this.inertia)), super._checkInputs();
  }
  _updateCameraRotationMatrix() {
    this.rotationQuaternion ? this.rotationQuaternion.toRotationMatrix(this._cameraRotationMatrix) : B.RotationYawPitchRollToRef(this.rotation.y, this.rotation.x, this.rotation.z, this._cameraRotationMatrix);
  }
  /**
   * Update the up vector to apply the rotation of the camera (So if you changed the camera rotation.z this will let you update the up vector as well)
   * @returns the current camera
   */
  _rotateUpVectorWithCameraRotationMatrix() {
    return g.TransformNormalToRef(this._defaultUp, this._cameraRotationMatrix, this.upVector), this;
  }
  /** @internal */
  _getViewMatrix() {
    return this.lockedTarget && this.setTarget(this._getLockedTargetPosition()), this._updateCameraRotationMatrix(), this.rotationQuaternion && this._cachedQuaternionRotationZ != this.rotationQuaternion.z ? (this._rotateUpVectorWithCameraRotationMatrix(), this._cachedQuaternionRotationZ = this.rotationQuaternion.z) : this._cachedRotationZ !== this.rotation.z && (this._rotateUpVectorWithCameraRotationMatrix(), this._cachedRotationZ = this.rotation.z), g.TransformCoordinatesToRef(this._referencePoint, this._cameraRotationMatrix, this._transformedReferencePoint), this.position.addToRef(this._transformedReferencePoint, this._currentTarget), this.updateUpVectorFromRotation && (this.rotationQuaternion ? ni.Y.rotateByQuaternionToRef(this.rotationQuaternion, this.upVector) : (Xe.FromEulerVectorToRef(this.rotation, this._tmpQuaternion), ni.Y.rotateByQuaternionToRef(this._tmpQuaternion, this.upVector))), this._computeViewMatrix(this.position, this._currentTarget, this.upVector), this._viewMatrix;
  }
  _computeViewMatrix(e, t, i) {
    if (this.ignoreParentScaling) {
      if (this.parent) {
        const r = this.parent.getWorldMatrix();
        g.TransformCoordinatesToRef(e, r, this._globalPosition), g.TransformCoordinatesToRef(t, r, this._tmpTargetVector), g.TransformNormalToRef(i, r, this._tmpUpVector), this._markSyncedWithParent();
      } else
        this._globalPosition.copyFrom(e), this._tmpTargetVector.copyFrom(t), this._tmpUpVector.copyFrom(i);
      this.getScene().useRightHandedSystem ? B.LookAtRHToRef(this._globalPosition, this._tmpTargetVector, this._tmpUpVector, this._viewMatrix) : B.LookAtLHToRef(this._globalPosition, this._tmpTargetVector, this._tmpUpVector, this._viewMatrix);
      return;
    }
    if (this.getScene().useRightHandedSystem ? B.LookAtRHToRef(e, t, i, this._viewMatrix) : B.LookAtLHToRef(e, t, i, this._viewMatrix), this.parent) {
      const r = this.parent.getWorldMatrix();
      this._viewMatrix.invert(), this._viewMatrix.multiplyToRef(r, this._viewMatrix), this._viewMatrix.getTranslationToRef(this._globalPosition), this._viewMatrix.invert(), this._markSyncedWithParent();
    } else
      this._globalPosition.copyFrom(e);
  }
  /**
   * @internal
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createRigCamera(e, t) {
    if (this.cameraRigMode !== Se.RIG_MODE_NONE) {
      const i = new se(e, this.position.clone(), this.getScene());
      return i.isRigCamera = !0, i.rigParent = this, (this.cameraRigMode === Se.RIG_MODE_VR || this.cameraRigMode === Se.RIG_MODE_WEBVR) && (this.rotationQuaternion || (this.rotationQuaternion = new Xe()), i._cameraRigParams = {}, i.rotationQuaternion = new Xe()), i.mode = this.mode, i.orthoLeft = this.orthoLeft, i.orthoRight = this.orthoRight, i.orthoTop = this.orthoTop, i.orthoBottom = this.orthoBottom, i;
    }
    return null;
  }
  /**
   * @internal
   */
  _updateRigCameras() {
    const e = this._rigCameras[0], t = this._rigCameras[1];
    switch (this.computeWorldMatrix(), this.cameraRigMode) {
      case Se.RIG_MODE_STEREOSCOPIC_ANAGLYPH:
      case Se.RIG_MODE_STEREOSCOPIC_SIDEBYSIDE_PARALLEL:
      case Se.RIG_MODE_STEREOSCOPIC_SIDEBYSIDE_CROSSEYED:
      case Se.RIG_MODE_STEREOSCOPIC_OVERUNDER:
      case Se.RIG_MODE_STEREOSCOPIC_INTERLACED: {
        const i = this.cameraRigMode === Se.RIG_MODE_STEREOSCOPIC_SIDEBYSIDE_CROSSEYED ? 1 : -1, r = this.cameraRigMode === Se.RIG_MODE_STEREOSCOPIC_SIDEBYSIDE_CROSSEYED ? -1 : 1;
        this._getRigCamPositionAndTarget(this._cameraRigParams.stereoHalfAngle * i, e), this._getRigCamPositionAndTarget(this._cameraRigParams.stereoHalfAngle * r, t);
        break;
      }
      case Se.RIG_MODE_VR:
        e.rotationQuaternion ? (e.rotationQuaternion.copyFrom(this.rotationQuaternion), t.rotationQuaternion.copyFrom(this.rotationQuaternion)) : (e.rotation.copyFrom(this.rotation), t.rotation.copyFrom(this.rotation)), e.position.copyFrom(this.position), t.position.copyFrom(this.position);
        break;
    }
    super._updateRigCameras();
  }
  _getRigCamPositionAndTarget(e, t) {
    this.getTarget().subtractToRef(this.position, se._TargetFocalPoint), se._TargetFocalPoint.normalize().scaleInPlace(this._initialFocalDistance);
    const r = se._TargetFocalPoint.addInPlace(this.position);
    B.TranslationToRef(-r.x, -r.y, -r.z, se._TargetTransformMatrix), se._TargetTransformMatrix.multiplyToRef(B.RotationAxis(t.upVector, e), se._RigCamTransformMatrix), B.TranslationToRef(r.x, r.y, r.z, se._TargetTransformMatrix), se._RigCamTransformMatrix.multiplyToRef(se._TargetTransformMatrix, se._RigCamTransformMatrix), g.TransformCoordinatesToRef(this.position, se._RigCamTransformMatrix, t.position), t.setTarget(r);
  }
  /**
   * Gets the current object class name.
   * @returns the class name
   */
  getClassName() {
    return "TargetCamera";
  }
}
se._RigCamTransformMatrix = new B();
se._TargetTransformMatrix = new B();
se._TargetFocalPoint = new g();
h([
  mt()
], se.prototype, "rotation", void 0);
h([
  T()
], se.prototype, "speed", void 0);
h([
  Ki("lockedTargetId")
], se.prototype, "lockedTarget", void 0);
function hr(l) {
  const { scene: e } = l;
  let t;
  const i = 36.5;
  return t = new se("TargetCamera1", new g(0, i, 0), e), t.fov = 0.25, t.minZ = 5, t.maxZ = i + 1, t.setTarget(g.Zero()), t;
}
class V extends gt {
  /**
   * Defines how far from the source the light is impacting in scene units.
   * Note: Unused in PBR material as the distance light falloff is defined following the inverse squared falloff.
   */
  get range() {
    return this._range;
  }
  /**
   * Defines how far from the source the light is impacting in scene units.
   * Note: Unused in PBR material as the distance light falloff is defined following the inverse squared falloff.
   */
  set range(e) {
    this._range = e, this._inverseSquaredRange = 1 / (this.range * this.range);
  }
  /**
   * Gets the photometric scale used to interpret the intensity.
   * This is only relevant with PBR Materials where the light intensity can be defined in a physical way.
   */
  get intensityMode() {
    return this._intensityMode;
  }
  /**
   * Sets the photometric scale used to interpret the intensity.
   * This is only relevant with PBR Materials where the light intensity can be defined in a physical way.
   */
  set intensityMode(e) {
    this._intensityMode = e, this._computePhotometricScale();
  }
  /**
   * Gets the light radius used by PBR Materials to simulate soft area lights.
   */
  get radius() {
    return this._radius;
  }
  /**
   * sets the light radius used by PBR Materials to simulate soft area lights.
   */
  set radius(e) {
    this._radius = e, this._computePhotometricScale();
  }
  /**
   * Gets whether or not the shadows are enabled for this light. This can help turning off/on shadow without detaching
   * the current shadow generator.
   */
  get shadowEnabled() {
    return this._shadowEnabled;
  }
  /**
   * Sets whether or not the shadows are enabled for this light. This can help turning off/on shadow without detaching
   * the current shadow generator.
   */
  set shadowEnabled(e) {
    this._shadowEnabled !== e && (this._shadowEnabled = e, this._markMeshesAsLightDirty());
  }
  /**
   * Gets the only meshes impacted by this light.
   */
  get includedOnlyMeshes() {
    return this._includedOnlyMeshes;
  }
  /**
   * Sets the only meshes impacted by this light.
   */
  set includedOnlyMeshes(e) {
    this._includedOnlyMeshes = e, this._hookArrayForIncludedOnly(e);
  }
  /**
   * Gets the meshes not impacted by this light.
   */
  get excludedMeshes() {
    return this._excludedMeshes;
  }
  /**
   * Sets the meshes not impacted by this light.
   */
  set excludedMeshes(e) {
    this._excludedMeshes = e, this._hookArrayForExcluded(e);
  }
  /**
   * Gets the layer id use to find what meshes are not impacted by the light.
   * Inactive if 0
   */
  get excludeWithLayerMask() {
    return this._excludeWithLayerMask;
  }
  /**
   * Sets the layer id use to find what meshes are not impacted by the light.
   * Inactive if 0
   */
  set excludeWithLayerMask(e) {
    this._excludeWithLayerMask = e, this._resyncMeshes();
  }
  /**
   * Gets the layer id use to find what meshes are impacted by the light.
   * Inactive if 0
   */
  get includeOnlyWithLayerMask() {
    return this._includeOnlyWithLayerMask;
  }
  /**
   * Sets the layer id use to find what meshes are impacted by the light.
   * Inactive if 0
   */
  set includeOnlyWithLayerMask(e) {
    this._includeOnlyWithLayerMask = e, this._resyncMeshes();
  }
  /**
   * Gets the lightmap mode of this light (should be one of the constants defined by Light.LIGHTMAP_x)
   */
  get lightmapMode() {
    return this._lightmapMode;
  }
  /**
   * Sets the lightmap mode of this light (should be one of the constants defined by Light.LIGHTMAP_x)
   */
  set lightmapMode(e) {
    this._lightmapMode !== e && (this._lightmapMode = e, this._markMeshesAsLightDirty());
  }
  /**
   * Creates a Light object in the scene.
   * Documentation : https://doc.babylonjs.com/features/featuresDeepDive/lights/lights_introduction
   * @param name The friendly name of the light
   * @param scene The scene the light belongs too
   */
  constructor(e, t) {
    super(e, t), this.diffuse = new K(1, 1, 1), this.specular = new K(1, 1, 1), this.falloffType = V.FALLOFF_DEFAULT, this.intensity = 1, this._range = Number.MAX_VALUE, this._inverseSquaredRange = 0, this._photometricScale = 1, this._intensityMode = V.INTENSITYMODE_AUTOMATIC, this._radius = 1e-5, this.renderPriority = 0, this._shadowEnabled = !0, this._excludeWithLayerMask = 0, this._includeOnlyWithLayerMask = 0, this._lightmapMode = 0, this._shadowGenerators = null, this._excludedMeshesIds = new Array(), this._includedOnlyMeshesIds = new Array(), this._isLight = !0, this.getScene().addLight(this), this._uniformBuffer = new Zi(this.getScene().getEngine(), void 0, void 0, e), this._buildUniformLayout(), this.includedOnlyMeshes = new Array(), this.excludedMeshes = new Array(), this._resyncMeshes();
  }
  /**
   * Sets the passed Effect "effect" with the Light textures.
   * @param effect The effect to update
   * @param lightIndex The index of the light in the effect to update
   * @returns The light
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transferTexturesToEffect(e, t) {
    return this;
  }
  /**
   * Binds the lights information from the scene to the effect for the given mesh.
   * @param lightIndex Light index
   * @param scene The scene where the light belongs to
   * @param effect The effect we are binding the data to
   * @param useSpecular Defines if specular is supported
   * @param receiveShadows Defines if the effect (mesh) we bind the light for receives shadows
   */
  _bindLight(e, t, i, r, s = !0) {
    var n;
    const o = e.toString();
    let a = !1;
    if (this._uniformBuffer.bindToEffect(i, "Light" + o), this._renderId !== t.getRenderId() || this._lastUseSpecular !== r || !this._uniformBuffer.useUbo) {
      this._renderId = t.getRenderId(), this._lastUseSpecular = r;
      const f = this.getScaledIntensity();
      this.transferToEffect(i, o), this.diffuse.scaleToRef(f, ke.Color3[0]), this._uniformBuffer.updateColor4("vLightDiffuse", ke.Color3[0], this.range, o), r && (this.specular.scaleToRef(f, ke.Color3[1]), this._uniformBuffer.updateColor4("vLightSpecular", ke.Color3[1], this.radius, o)), a = !0;
    }
    if (this.transferTexturesToEffect(i, o), t.shadowsEnabled && this.shadowEnabled && s) {
      const f = (n = this.getShadowGenerator(t.activeCamera)) !== null && n !== void 0 ? n : this.getShadowGenerator();
      f && (f.bindShadowLight(o, i), a = !0);
    }
    a ? this._uniformBuffer.update() : this._uniformBuffer.bindUniformBuffer();
  }
  /**
   * Returns the string "Light".
   * @returns the class name
   */
  getClassName() {
    return "Light";
  }
  /**
   * Converts the light information to a readable string for debug purpose.
   * @param fullDetails Supports for multiple levels of logging within scene loading
   * @returns the human readable light info
   */
  toString(e) {
    let t = "Name: " + this.name;
    if (t += ", type: " + ["Point", "Directional", "Spot", "Hemispheric"][this.getTypeID()], this.animations)
      for (let i = 0; i < this.animations.length; i++)
        t += ", animation[0]: " + this.animations[i].toString(e);
    return t;
  }
  /** @internal */
  _syncParentEnabledState() {
    super._syncParentEnabledState(), this.isDisposed() || this._resyncMeshes();
  }
  /**
   * Set the enabled state of this node.
   * @param value - the new enabled state
   */
  setEnabled(e) {
    super.setEnabled(e), this._resyncMeshes();
  }
  /**
   * Returns the Light associated shadow generator if any.
   * @param camera Camera for which the shadow generator should be retrieved (default: null). If null, retrieves the default shadow generator
   * @returns the associated shadow generator.
   */
  getShadowGenerator(e = null) {
    var t;
    return this._shadowGenerators === null ? null : (t = this._shadowGenerators.get(e)) !== null && t !== void 0 ? t : null;
  }
  /**
   * Returns all the shadow generators associated to this light
   * @returns
   */
  getShadowGenerators() {
    return this._shadowGenerators;
  }
  /**
   * Returns a Vector3, the absolute light position in the World.
   * @returns the world space position of the light
   */
  getAbsolutePosition() {
    return g.Zero();
  }
  /**
   * Specifies if the light will affect the passed mesh.
   * @param mesh The mesh to test against the light
   * @returns true the mesh is affected otherwise, false.
   */
  canAffectMesh(e) {
    return e ? !(this.includedOnlyMeshes && this.includedOnlyMeshes.length > 0 && this.includedOnlyMeshes.indexOf(e) === -1 || this.excludedMeshes && this.excludedMeshes.length > 0 && this.excludedMeshes.indexOf(e) !== -1 || this.includeOnlyWithLayerMask !== 0 && !(this.includeOnlyWithLayerMask & e.layerMask) || this.excludeWithLayerMask !== 0 && this.excludeWithLayerMask & e.layerMask) : !0;
  }
  /**
   * Releases resources associated with this node.
   * @param doNotRecurse Set to true to not recurse into each children (recurse into each children by default)
   * @param disposeMaterialAndTextures Set to true to also dispose referenced materials and textures (false by default)
   */
  dispose(e, t = !1) {
    if (this._shadowGenerators) {
      const i = this._shadowGenerators.values();
      for (let r = i.next(); r.done !== !0; r = i.next())
        r.value.dispose();
      this._shadowGenerators = null;
    }
    if (this.getScene().stopAnimation(this), this._parentContainer) {
      const i = this._parentContainer.lights.indexOf(this);
      i > -1 && this._parentContainer.lights.splice(i, 1), this._parentContainer = null;
    }
    for (const i of this.getScene().meshes)
      i._removeLightSource(this, !0);
    this._uniformBuffer.dispose(), this.getScene().removeLight(this), super.dispose(e, t);
  }
  /**
   * Returns the light type ID (integer).
   * @returns The light Type id as a constant defines in Light.LIGHTTYPEID_x
   */
  getTypeID() {
    return 0;
  }
  /**
   * Returns the intensity scaled by the Photometric Scale according to the light type and intensity mode.
   * @returns the scaled intensity in intensity mode unit
   */
  getScaledIntensity() {
    return this._photometricScale * this.intensity;
  }
  /**
   * Returns a new Light object, named "name", from the current one.
   * @param name The name of the cloned light
   * @param newParent The parent of this light, if it has one
   * @returns the new created light
   */
  clone(e, t = null) {
    const i = V.GetConstructorFromName(this.getTypeID(), e, this.getScene());
    if (!i)
      return null;
    const r = j.Clone(i, this);
    return e && (r.name = e), t && (r.parent = t), r.setEnabled(this.isEnabled()), this.onClonedObservable.notifyObservers(r), r;
  }
  /**
   * Serializes the current light into a Serialization object.
   * @returns the serialized object.
   */
  serialize() {
    const e = j.Serialize(this);
    return e.uniqueId = this.uniqueId, e.type = this.getTypeID(), this.parent && this.parent._serializeAsParent(e), this.excludedMeshes.length > 0 && (e.excludedMeshesIds = [], this.excludedMeshes.forEach((t) => {
      e.excludedMeshesIds.push(t.id);
    })), this.includedOnlyMeshes.length > 0 && (e.includedOnlyMeshesIds = [], this.includedOnlyMeshes.forEach((t) => {
      e.includedOnlyMeshesIds.push(t.id);
    })), j.AppendSerializedAnimations(this, e), e.ranges = this.serializeAnimationRanges(), e.isEnabled = this.isEnabled(), e;
  }
  /**
   * Creates a new typed light from the passed type (integer) : point light = 0, directional light = 1, spot light = 2, hemispheric light = 3.
   * This new light is named "name" and added to the passed scene.
   * @param type Type according to the types available in Light.LIGHTTYPEID_x
   * @param name The friendly name of the light
   * @param scene The scene the new light will belong to
   * @returns the constructor function
   */
  static GetConstructorFromName(e, t, i) {
    const r = gt.Construct("Light_Type_" + e, t, i);
    return r || null;
  }
  /**
   * Parses the passed "parsedLight" and returns a new instanced Light from this parsing.
   * @param parsedLight The JSON representation of the light
   * @param scene The scene to create the parsed light in
   * @returns the created light after parsing
   */
  static Parse(e, t) {
    const i = V.GetConstructorFromName(e.type, e.name, t);
    if (!i)
      return null;
    const r = j.Parse(i, e, t);
    if (e.excludedMeshesIds && (r._excludedMeshesIds = e.excludedMeshesIds), e.includedOnlyMeshesIds && (r._includedOnlyMeshesIds = e.includedOnlyMeshesIds), e.parentId !== void 0 && (r._waitingParentId = e.parentId), e.parentInstanceIndex !== void 0 && (r._waitingParentInstanceIndex = e.parentInstanceIndex), e.falloffType !== void 0 && (r.falloffType = e.falloffType), e.lightmapMode !== void 0 && (r.lightmapMode = e.lightmapMode), e.animations) {
      for (let s = 0; s < e.animations.length; s++) {
        const n = e.animations[s], o = Gt("BABYLON.Animation");
        o && r.animations.push(o.Parse(n));
      }
      gt.ParseAnimationRanges(r, e, t);
    }
    return e.autoAnimate && t.beginAnimation(r, e.autoAnimateFrom, e.autoAnimateTo, e.autoAnimateLoop, e.autoAnimateSpeed || 1), e.isEnabled !== void 0 && r.setEnabled(e.isEnabled), r;
  }
  _hookArrayForExcluded(e) {
    const t = e.push;
    e.push = (...r) => {
      const s = t.apply(e, r);
      for (const n of r)
        n._resyncLightSource(this);
      return s;
    };
    const i = e.splice;
    e.splice = (r, s) => {
      const n = i.apply(e, [r, s]);
      for (const o of n)
        o._resyncLightSource(this);
      return n;
    };
    for (const r of e)
      r._resyncLightSource(this);
  }
  _hookArrayForIncludedOnly(e) {
    const t = e.push;
    e.push = (...r) => {
      const s = t.apply(e, r);
      return this._resyncMeshes(), s;
    };
    const i = e.splice;
    e.splice = (r, s) => {
      const n = i.apply(e, [r, s]);
      return this._resyncMeshes(), n;
    }, this._resyncMeshes();
  }
  _resyncMeshes() {
    for (const e of this.getScene().meshes)
      e._resyncLightSource(this);
  }
  /**
   * Forces the meshes to update their light related information in their rendering used effects
   * @internal Internal Use Only
   */
  _markMeshesAsLightDirty() {
    for (const e of this.getScene().meshes)
      e.lightSources.indexOf(this) !== -1 && e._markSubMeshesAsLightDirty();
  }
  /**
   * Recomputes the cached photometric scale if needed.
   */
  _computePhotometricScale() {
    this._photometricScale = this._getPhotometricScale(), this.getScene().resetCachedMaterial();
  }
  /**
   * Returns the Photometric Scale according to the light type and intensity mode.
   */
  _getPhotometricScale() {
    let e = 0;
    const t = this.getTypeID();
    let i = this.intensityMode;
    switch (i === V.INTENSITYMODE_AUTOMATIC && (t === V.LIGHTTYPEID_DIRECTIONALLIGHT ? i = V.INTENSITYMODE_ILLUMINANCE : i = V.INTENSITYMODE_LUMINOUSINTENSITY), t) {
      case V.LIGHTTYPEID_POINTLIGHT:
      case V.LIGHTTYPEID_SPOTLIGHT:
        switch (i) {
          case V.INTENSITYMODE_LUMINOUSPOWER:
            e = 1 / (4 * Math.PI);
            break;
          case V.INTENSITYMODE_LUMINOUSINTENSITY:
            e = 1;
            break;
          case V.INTENSITYMODE_LUMINANCE:
            e = this.radius * this.radius;
            break;
        }
        break;
      case V.LIGHTTYPEID_DIRECTIONALLIGHT:
        switch (i) {
          case V.INTENSITYMODE_ILLUMINANCE:
            e = 1;
            break;
          case V.INTENSITYMODE_LUMINANCE: {
            let r = this.radius;
            r = Math.max(r, 1e-3), e = 2 * Math.PI * (1 - Math.cos(r));
            break;
          }
        }
        break;
      case V.LIGHTTYPEID_HEMISPHERICLIGHT:
        e = 1;
        break;
    }
    return e;
  }
  /**
   * Reorder the light in the scene according to their defined priority.
   * @internal Internal Use Only
   */
  _reorderLightsInScene() {
    const e = this.getScene();
    this._renderPriority != 0 && (e.requireLightSorting = !0), this.getScene().sortLightsByPriority();
  }
}
V.FALLOFF_DEFAULT = ue.FALLOFF_DEFAULT;
V.FALLOFF_PHYSICAL = ue.FALLOFF_PHYSICAL;
V.FALLOFF_GLTF = ue.FALLOFF_GLTF;
V.FALLOFF_STANDARD = ue.FALLOFF_STANDARD;
V.LIGHTMAP_DEFAULT = ue.LIGHTMAP_DEFAULT;
V.LIGHTMAP_SPECULAR = ue.LIGHTMAP_SPECULAR;
V.LIGHTMAP_SHADOWSONLY = ue.LIGHTMAP_SHADOWSONLY;
V.INTENSITYMODE_AUTOMATIC = ue.INTENSITYMODE_AUTOMATIC;
V.INTENSITYMODE_LUMINOUSPOWER = ue.INTENSITYMODE_LUMINOUSPOWER;
V.INTENSITYMODE_LUMINOUSINTENSITY = ue.INTENSITYMODE_LUMINOUSINTENSITY;
V.INTENSITYMODE_ILLUMINANCE = ue.INTENSITYMODE_ILLUMINANCE;
V.INTENSITYMODE_LUMINANCE = ue.INTENSITYMODE_LUMINANCE;
V.LIGHTTYPEID_POINTLIGHT = ue.LIGHTTYPEID_POINTLIGHT;
V.LIGHTTYPEID_DIRECTIONALLIGHT = ue.LIGHTTYPEID_DIRECTIONALLIGHT;
V.LIGHTTYPEID_SPOTLIGHT = ue.LIGHTTYPEID_SPOTLIGHT;
V.LIGHTTYPEID_HEMISPHERICLIGHT = ue.LIGHTTYPEID_HEMISPHERICLIGHT;
h([
  ce()
], V.prototype, "diffuse", void 0);
h([
  ce()
], V.prototype, "specular", void 0);
h([
  T()
], V.prototype, "falloffType", void 0);
h([
  T()
], V.prototype, "intensity", void 0);
h([
  T()
], V.prototype, "range", null);
h([
  T()
], V.prototype, "intensityMode", null);
h([
  T()
], V.prototype, "radius", null);
h([
  T()
], V.prototype, "_renderPriority", void 0);
h([
  v("_reorderLightsInScene")
], V.prototype, "renderPriority", void 0);
h([
  T("shadowEnabled")
], V.prototype, "_shadowEnabled", void 0);
h([
  T("excludeWithLayerMask")
], V.prototype, "_excludeWithLayerMask", void 0);
h([
  T("includeOnlyWithLayerMask")
], V.prototype, "_includeOnlyWithLayerMask", void 0);
h([
  T("lightmapMode")
], V.prototype, "_lightmapMode", void 0);
class Dt extends V {
  constructor() {
    super(...arguments), this._needProjectionMatrixCompute = !0;
  }
  _setPosition(e) {
    this._position = e;
  }
  /**
   * Sets the position the shadow will be casted from. Also use as the light position for both
   * point and spot lights.
   */
  get position() {
    return this._position;
  }
  /**
   * Sets the position the shadow will be casted from. Also use as the light position for both
   * point and spot lights.
   */
  set position(e) {
    this._setPosition(e);
  }
  _setDirection(e) {
    this._direction = e;
  }
  /**
   * In 2d mode (needCube being false), gets the direction used to cast the shadow.
   * Also use as the light direction on spot and directional lights.
   */
  get direction() {
    return this._direction;
  }
  /**
   * In 2d mode (needCube being false), sets the direction used to cast the shadow.
   * Also use as the light direction on spot and directional lights.
   */
  set direction(e) {
    this._setDirection(e);
  }
  /**
   * Gets the shadow projection clipping minimum z value.
   */
  get shadowMinZ() {
    return this._shadowMinZ;
  }
  /**
   * Sets the shadow projection clipping minimum z value.
   */
  set shadowMinZ(e) {
    this._shadowMinZ = e, this.forceProjectionMatrixCompute();
  }
  /**
   * Sets the shadow projection clipping maximum z value.
   */
  get shadowMaxZ() {
    return this._shadowMaxZ;
  }
  /**
   * Gets the shadow projection clipping maximum z value.
   */
  set shadowMaxZ(e) {
    this._shadowMaxZ = e, this.forceProjectionMatrixCompute();
  }
  /**
   * Computes the transformed information (transformedPosition and transformedDirection in World space) of the current light
   * @returns true if the information has been computed, false if it does not need to (no parenting)
   */
  computeTransformedInformation() {
    return this.parent && this.parent.getWorldMatrix ? (this.transformedPosition || (this.transformedPosition = g.Zero()), g.TransformCoordinatesToRef(this.position, this.parent.getWorldMatrix(), this.transformedPosition), this.direction && (this.transformedDirection || (this.transformedDirection = g.Zero()), g.TransformNormalToRef(this.direction, this.parent.getWorldMatrix(), this.transformedDirection)), !0) : !1;
  }
  /**
   * Return the depth scale used for the shadow map.
   * @returns the depth scale.
   */
  getDepthScale() {
    return 50;
  }
  /**
   * Get the direction to use to render the shadow map. In case of cube texture, the face index can be passed.
   * @param faceIndex The index of the face we are computed the direction to generate shadow
   * @returns The set direction in 2d mode otherwise the direction to the cubemap face if needCube() is true
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getShadowDirection(e) {
    return this.transformedDirection ? this.transformedDirection : this.direction;
  }
  /**
   * Returns the ShadowLight absolute position in the World.
   * @returns the position vector in world space
   */
  getAbsolutePosition() {
    return this.transformedPosition ? this.transformedPosition : this.position;
  }
  /**
   * Sets the ShadowLight direction toward the passed target.
   * @param target The point to target in local space
   * @returns the updated ShadowLight direction
   */
  setDirectionToTarget(e) {
    return this.direction = g.Normalize(e.subtract(this.position)), this.direction;
  }
  /**
   * Returns the light rotation in euler definition.
   * @returns the x y z rotation in local space.
   */
  getRotation() {
    this.direction.normalize();
    const e = g.Cross(this.direction, ni.Y), t = g.Cross(e, this.direction);
    return g.RotationFromAxis(e, t, this.direction);
  }
  /**
   * Returns whether or not the shadow generation require a cube texture or a 2d texture.
   * @returns true if a cube texture needs to be use
   */
  needCube() {
    return !1;
  }
  /**
   * Detects if the projection matrix requires to be recomputed this frame.
   * @returns true if it requires to be recomputed otherwise, false.
   */
  needProjectionMatrixCompute() {
    return this._needProjectionMatrixCompute;
  }
  /**
   * Forces the shadow generator to recompute the projection matrix even if position and direction did not changed.
   */
  forceProjectionMatrixCompute() {
    this._needProjectionMatrixCompute = !0;
  }
  /** @internal */
  _initCache() {
    super._initCache(), this._cache.position = g.Zero();
  }
  /** @internal */
  _isSynchronized() {
    return !!this._cache.position.equals(this.position);
  }
  /**
   * Computes the world matrix of the node
   * @param force defines if the cache version should be invalidated forcing the world matrix to be created from scratch
   * @returns the world matrix
   */
  computeWorldMatrix(e) {
    return !e && this.isSynchronized() ? (this._currentRenderId = this.getScene().getRenderId(), this._worldMatrix) : (this._updateCache(), this._cache.position.copyFrom(this.position), this._worldMatrix || (this._worldMatrix = B.Identity()), B.TranslationToRef(this.position.x, this.position.y, this.position.z, this._worldMatrix), this.parent && this.parent.getWorldMatrix && (this._worldMatrix.multiplyToRef(this.parent.getWorldMatrix(), this._worldMatrix), this._markSyncedWithParent()), this._worldMatrixDeterminantIsDirty = !0, this._worldMatrix);
  }
  /**
   * Gets the minZ used for shadow according to both the scene and the light.
   * @param activeCamera The camera we are returning the min for
   * @returns the depth min z
   */
  getDepthMinZ(e) {
    return this.shadowMinZ !== void 0 ? this.shadowMinZ : e.minZ;
  }
  /**
   * Gets the maxZ used for shadow according to both the scene and the light.
   * @param activeCamera The camera we are returning the max for
   * @returns the depth max z
   */
  getDepthMaxZ(e) {
    return this.shadowMaxZ !== void 0 ? this.shadowMaxZ : e.maxZ;
  }
  /**
   * Sets the shadow projection matrix in parameter to the generated projection matrix.
   * @param matrix The matrix to updated with the projection information
   * @param viewMatrix The transform matrix of the light
   * @param renderList The list of mesh to render in the map
   * @returns The current light
   */
  setShadowProjectionMatrix(e, t, i) {
    return this.customProjectionMatrixBuilder ? this.customProjectionMatrixBuilder(t, i, e) : this._setDefaultShadowProjectionMatrix(e, t, i), this;
  }
  /** @internal */
  _syncParentEnabledState() {
    super._syncParentEnabledState(), (!this.parent || !this.parent.getWorldMatrix) && (this.transformedPosition = null, this.transformedDirection = null);
  }
}
h([
  mt()
], Dt.prototype, "position", null);
h([
  mt()
], Dt.prototype, "direction", null);
h([
  T()
], Dt.prototype, "shadowMinZ", null);
h([
  T()
], Dt.prototype, "shadowMaxZ", null);
gt.AddNodeConstructor("Light_Type_1", (l, e) => () => new Ue(l, g.Zero(), e));
class Ue extends Dt {
  /**
   * Fix frustum size for the shadow generation. This is disabled if the value is 0.
   */
  get shadowFrustumSize() {
    return this._shadowFrustumSize;
  }
  /**
   * Specifies a fix frustum size for the shadow generation.
   */
  set shadowFrustumSize(e) {
    this._shadowFrustumSize = e, this.forceProjectionMatrixCompute();
  }
  /**
   * Gets the shadow projection scale against the optimal computed one.
   * 0.1 by default which means that the projection window is increase by 10% from the optimal size.
   * This does not impact in fixed frustum size (shadowFrustumSize being set)
   */
  get shadowOrthoScale() {
    return this._shadowOrthoScale;
  }
  /**
   * Sets the shadow projection scale against the optimal computed one.
   * 0.1 by default which means that the projection window is increase by 10% from the optimal size.
   * This does not impact in fixed frustum size (shadowFrustumSize being set)
   */
  set shadowOrthoScale(e) {
    this._shadowOrthoScale = e, this.forceProjectionMatrixCompute();
  }
  /**
   * Gets or sets the orthoLeft property used to build the light frustum
   */
  get orthoLeft() {
    return this._orthoLeft;
  }
  set orthoLeft(e) {
    this._orthoLeft = e;
  }
  /**
   * Gets or sets the orthoRight property used to build the light frustum
   */
  get orthoRight() {
    return this._orthoRight;
  }
  set orthoRight(e) {
    this._orthoRight = e;
  }
  /**
   * Gets or sets the orthoTop property used to build the light frustum
   */
  get orthoTop() {
    return this._orthoTop;
  }
  set orthoTop(e) {
    this._orthoTop = e;
  }
  /**
   * Gets or sets the orthoBottom property used to build the light frustum
   */
  get orthoBottom() {
    return this._orthoBottom;
  }
  set orthoBottom(e) {
    this._orthoBottom = e;
  }
  /**
   * Creates a DirectionalLight object in the scene, oriented towards the passed direction (Vector3).
   * The directional light is emitted from everywhere in the given direction.
   * It can cast shadows.
   * Documentation : https://doc.babylonjs.com/features/featuresDeepDive/lights/lights_introduction
   * @param name The friendly name of the light
   * @param direction The direction of the light
   * @param scene The scene the light belongs to
   */
  constructor(e, t, i) {
    super(e, i), this._shadowFrustumSize = 0, this._shadowOrthoScale = 0.1, this.autoUpdateExtends = !0, this.autoCalcShadowZBounds = !1, this._orthoLeft = Number.MAX_VALUE, this._orthoRight = Number.MIN_VALUE, this._orthoTop = Number.MIN_VALUE, this._orthoBottom = Number.MAX_VALUE, this.position = t.scale(-1), this.direction = t;
  }
  /**
   * Returns the string "DirectionalLight".
   * @returns The class name
   */
  getClassName() {
    return "DirectionalLight";
  }
  /**
   * Returns the integer 1.
   * @returns The light Type id as a constant defines in Light.LIGHTTYPEID_x
   */
  getTypeID() {
    return V.LIGHTTYPEID_DIRECTIONALLIGHT;
  }
  /**
   * Sets the passed matrix "matrix" as projection matrix for the shadows cast by the light according to the passed view matrix.
   * Returns the DirectionalLight Shadow projection matrix.
   * @param matrix
   * @param viewMatrix
   * @param renderList
   */
  _setDefaultShadowProjectionMatrix(e, t, i) {
    this.shadowFrustumSize > 0 ? this._setDefaultFixedFrustumShadowProjectionMatrix(e) : this._setDefaultAutoExtendShadowProjectionMatrix(e, t, i);
  }
  /**
   * Sets the passed matrix "matrix" as fixed frustum projection matrix for the shadows cast by the light according to the passed view matrix.
   * Returns the DirectionalLight Shadow projection matrix.
   * @param matrix
   */
  _setDefaultFixedFrustumShadowProjectionMatrix(e) {
    const t = this.getScene().activeCamera;
    t && B.OrthoLHToRef(this.shadowFrustumSize, this.shadowFrustumSize, this.shadowMinZ !== void 0 ? this.shadowMinZ : t.minZ, this.shadowMaxZ !== void 0 ? this.shadowMaxZ : t.maxZ, e, this.getScene().getEngine().isNDCHalfZRange);
  }
  /**
   * Sets the passed matrix "matrix" as auto extend projection matrix for the shadows cast by the light according to the passed view matrix.
   * Returns the DirectionalLight Shadow projection matrix.
   * @param matrix
   * @param viewMatrix
   * @param renderList
   */
  _setDefaultAutoExtendShadowProjectionMatrix(e, t, i) {
    const r = this.getScene().activeCamera;
    if (!r)
      return;
    if (this.autoUpdateExtends || this._orthoLeft === Number.MAX_VALUE) {
      const c = g.Zero();
      this._orthoLeft = Number.MAX_VALUE, this._orthoRight = Number.MIN_VALUE, this._orthoTop = Number.MIN_VALUE, this._orthoBottom = Number.MAX_VALUE;
      let d = Number.MAX_VALUE, E = Number.MIN_VALUE;
      for (let u = 0; u < i.length; u++) {
        const _ = i[u];
        if (!_)
          continue;
        const A = _.getBoundingInfo().boundingBox;
        for (let R = 0; R < A.vectorsWorld.length; R++)
          g.TransformCoordinatesToRef(A.vectorsWorld[R], t, c), c.x < this._orthoLeft && (this._orthoLeft = c.x), c.y < this._orthoBottom && (this._orthoBottom = c.y), c.x > this._orthoRight && (this._orthoRight = c.x), c.y > this._orthoTop && (this._orthoTop = c.y), this.autoCalcShadowZBounds && (c.z < d && (d = c.z), c.z > E && (E = c.z));
      }
      this.autoCalcShadowZBounds && (this._shadowMinZ = d, this._shadowMaxZ = E);
    }
    const s = this._orthoRight - this._orthoLeft, n = this._orthoTop - this._orthoBottom, o = this.shadowMinZ !== void 0 ? this.shadowMinZ : r.minZ, a = this.shadowMaxZ !== void 0 ? this.shadowMaxZ : r.maxZ, f = this.getScene().getEngine().useReverseDepthBuffer;
    B.OrthoOffCenterLHToRef(this._orthoLeft - s * this.shadowOrthoScale, this._orthoRight + s * this.shadowOrthoScale, this._orthoBottom - n * this.shadowOrthoScale, this._orthoTop + n * this.shadowOrthoScale, f ? a : o, f ? o : a, e, this.getScene().getEngine().isNDCHalfZRange);
  }
  _buildUniformLayout() {
    this._uniformBuffer.addUniform("vLightData", 4), this._uniformBuffer.addUniform("vLightDiffuse", 4), this._uniformBuffer.addUniform("vLightSpecular", 4), this._uniformBuffer.addUniform("shadowsInfo", 3), this._uniformBuffer.addUniform("depthValues", 2), this._uniformBuffer.create();
  }
  /**
   * Sets the passed Effect object with the DirectionalLight transformed position (or position if not parented) and the passed name.
   * @param effect The effect to update
   * @param lightIndex The index of the light in the effect to update
   * @returns The directional light
   */
  transferToEffect(e, t) {
    return this.computeTransformedInformation() ? (this._uniformBuffer.updateFloat4("vLightData", this.transformedDirection.x, this.transformedDirection.y, this.transformedDirection.z, 1, t), this) : (this._uniformBuffer.updateFloat4("vLightData", this.direction.x, this.direction.y, this.direction.z, 1, t), this);
  }
  transferToNodeMaterialEffect(e, t) {
    return this.computeTransformedInformation() ? (e.setFloat3(t, this.transformedDirection.x, this.transformedDirection.y, this.transformedDirection.z), this) : (e.setFloat3(t, this.direction.x, this.direction.y, this.direction.z), this);
  }
  /**
   * Gets the minZ used for shadow according to both the scene and the light.
   *
   * Values are fixed on directional lights as it relies on an ortho projection hence the need to convert being
   * -1 and 1 to 0 and 1 doing (depth + min) / (min + max) -> (depth + 1) / (1 + 1) -> (depth * 0.5) + 0.5.
   * (when not using reverse depth buffer / NDC half Z range)
   * @param activeCamera The camera we are returning the min for
   * @returns the depth min z
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getDepthMinZ(e) {
    const t = this._scene.getEngine();
    return !t.useReverseDepthBuffer && t.isNDCHalfZRange ? 0 : 1;
  }
  /**
   * Gets the maxZ used for shadow according to both the scene and the light.
   *
   * Values are fixed on directional lights as it relies on an ortho projection hence the need to convert being
   * -1 and 1 to 0 and 1 doing (depth + min) / (min + max) -> (depth + 1) / (1 + 1) -> (depth * 0.5) + 0.5.
   * (when not using reverse depth buffer / NDC half Z range)
   * @param activeCamera The camera we are returning the max for
   * @returns the depth max z
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getDepthMaxZ(e) {
    const t = this._scene.getEngine();
    return t.useReverseDepthBuffer && t.isNDCHalfZRange ? 0 : 1;
  }
  /**
   * Prepares the list of defines specific to the light type.
   * @param defines the list of defines
   * @param lightIndex defines the index of the light for the effect
   */
  prepareLightSpecificDefines(e, t) {
    e["DIRLIGHT" + t] = !0;
  }
}
h([
  T()
], Ue.prototype, "shadowFrustumSize", null);
h([
  T()
], Ue.prototype, "shadowOrthoScale", null);
h([
  T()
], Ue.prototype, "autoUpdateExtends", void 0);
h([
  T()
], Ue.prototype, "autoCalcShadowZBounds", void 0);
h([
  T("orthoLeft")
], Ue.prototype, "_orthoLeft", void 0);
h([
  T("orthoRight")
], Ue.prototype, "_orthoRight", void 0);
h([
  T("orthoTop")
], Ue.prototype, "_orthoTop", void 0);
h([
  T("orthoBottom")
], Ue.prototype, "_orthoBottom", void 0);
gt.AddNodeConstructor("Light_Type_3", (l, e) => () => new Xt(l, g.Zero(), e));
class Xt extends V {
  /**
   * Creates a HemisphericLight object in the scene according to the passed direction (Vector3).
   * The HemisphericLight simulates the ambient environment light, so the passed direction is the light reflection direction, not the incoming direction.
   * The HemisphericLight can't cast shadows.
   * Documentation : https://doc.babylonjs.com/features/featuresDeepDive/lights/lights_introduction
   * @param name The friendly name of the light
   * @param direction The direction of the light reflection
   * @param scene The scene the light belongs to
   */
  constructor(e, t, i) {
    super(e, i), this.groundColor = new K(0, 0, 0), this.direction = t || g.Up();
  }
  _buildUniformLayout() {
    this._uniformBuffer.addUniform("vLightData", 4), this._uniformBuffer.addUniform("vLightDiffuse", 4), this._uniformBuffer.addUniform("vLightSpecular", 4), this._uniformBuffer.addUniform("vLightGround", 3), this._uniformBuffer.addUniform("shadowsInfo", 3), this._uniformBuffer.addUniform("depthValues", 2), this._uniformBuffer.create();
  }
  /**
   * Returns the string "HemisphericLight".
   * @returns The class name
   */
  getClassName() {
    return "HemisphericLight";
  }
  /**
   * Sets the HemisphericLight direction towards the passed target (Vector3).
   * Returns the updated direction.
   * @param target The target the direction should point to
   * @returns The computed direction
   */
  setDirectionToTarget(e) {
    return this.direction = g.Normalize(e.subtract(g.Zero())), this.direction;
  }
  /**
   * Returns the shadow generator associated to the light.
   * @returns Always null for hemispheric lights because it does not support shadows.
   */
  getShadowGenerator() {
    return null;
  }
  /**
   * Sets the passed Effect object with the HemisphericLight normalized direction and color and the passed name (string).
   * @param _effect The effect to update
   * @param lightIndex The index of the light in the effect to update
   * @returns The hemispheric light
   */
  transferToEffect(e, t) {
    const i = g.Normalize(this.direction);
    return this._uniformBuffer.updateFloat4("vLightData", i.x, i.y, i.z, 0, t), this._uniformBuffer.updateColor3("vLightGround", this.groundColor.scale(this.intensity), t), this;
  }
  transferToNodeMaterialEffect(e, t) {
    const i = g.Normalize(this.direction);
    return e.setFloat3(t, i.x, i.y, i.z), this;
  }
  /**
   * Computes the world matrix of the node
   * @returns the world matrix
   */
  computeWorldMatrix() {
    return this._worldMatrix || (this._worldMatrix = B.Identity()), this._worldMatrix;
  }
  /**
   * Returns the integer 3.
   * @returns The light Type id as a constant defines in Light.LIGHTTYPEID_x
   */
  getTypeID() {
    return V.LIGHTTYPEID_HEMISPHERICLIGHT;
  }
  /**
   * Prepares the list of defines specific to the light type.
   * @param defines the list of defines
   * @param lightIndex defines the index of the light for the effect
   */
  prepareLightSpecificDefines(e, t) {
    e["HEMILIGHT" + t] = !0;
  }
}
h([
  ce()
], Xt.prototype, "groundColor", void 0);
h([
  mt()
], Xt.prototype, "direction", void 0);
class He {
  /**
   * Creates a Size object from the given width and height (floats).
   * @param width width of the new size
   * @param height height of the new size
   */
  constructor(e, t) {
    this.width = e, this.height = t;
  }
  /**
   * Returns a string with the Size width and height
   * @returns a string with the Size width and height
   */
  toString() {
    return `{W: ${this.width}, H: ${this.height}}`;
  }
  /**
   * "Size"
   * @returns the string "Size"
   */
  getClassName() {
    return "Size";
  }
  /**
   * Returns the Size hash code.
   * @returns a hash code for a unique width and height
   */
  getHashCode() {
    let e = this.width | 0;
    return e = e * 397 ^ (this.height | 0), e;
  }
  /**
   * Updates the current size from the given one.
   * @param src the given size
   */
  copyFrom(e) {
    this.width = e.width, this.height = e.height;
  }
  /**
   * Updates in place the current Size from the given floats.
   * @param width width of the new size
   * @param height height of the new size
   * @returns the updated Size.
   */
  copyFromFloats(e, t) {
    return this.width = e, this.height = t, this;
  }
  /**
   * Updates in place the current Size from the given floats.
   * @param width width to set
   * @param height height to set
   * @returns the updated Size.
   */
  set(e, t) {
    return this.copyFromFloats(e, t);
  }
  /**
   * Multiplies the width and height by numbers
   * @param w factor to multiple the width by
   * @param h factor to multiple the height by
   * @returns a new Size set with the multiplication result of the current Size and the given floats.
   */
  multiplyByFloats(e, t) {
    return new He(this.width * e, this.height * t);
  }
  /**
   * Clones the size
   * @returns a new Size copied from the given one.
   */
  clone() {
    return new He(this.width, this.height);
  }
  /**
   * True if the current Size and the given one width and height are strictly equal.
   * @param other the other size to compare against
   * @returns True if the current Size and the given one width and height are strictly equal.
   */
  equals(e) {
    return e ? this.width === e.width && this.height === e.height : !1;
  }
  /**
   * The surface of the Size : width * height (float).
   */
  get surface() {
    return this.width * this.height;
  }
  /**
   * Create a new size of zero
   * @returns a new Size set to (0.0, 0.0)
   */
  static Zero() {
    return new He(0, 0);
  }
  /**
   * Sums the width and height of two sizes
   * @param otherSize size to add to this size
   * @returns a new Size set as the addition result of the current Size and the given one.
   */
  add(e) {
    return new He(this.width + e.width, this.height + e.height);
  }
  /**
   * Subtracts the width and height of two
   * @param otherSize size to subtract to this size
   * @returns a new Size set as the subtraction result of  the given one from the current Size.
   */
  subtract(e) {
    return new He(this.width - e.width, this.height - e.height);
  }
  /**
   * Creates a new Size set at the linear interpolation "amount" between "start" and "end"
   * @param start starting size to lerp between
   * @param end end size to lerp between
   * @param amount amount to lerp between the start and end values
   * @returns a new Size set at the linear interpolation "amount" between "start" and "end"
   */
  static Lerp(e, t, i) {
    const r = e.width + (t.width - e.width) * i, s = e.height + (t.height - e.height) * i;
    return new He(r, s);
  }
}
class ci {
  /**
   * | Value | Type               | Description |
   * | ----- | ------------------ | ----------- |
   * | 0     | CLAMP_ADDRESSMODE  |             |
   * | 1     | WRAP_ADDRESSMODE   |             |
   * | 2     | MIRROR_ADDRESSMODE |             |
   */
  get wrapU() {
    return this._wrapU;
  }
  set wrapU(e) {
    this._wrapU = e;
  }
  /**
   * | Value | Type               | Description |
   * | ----- | ------------------ | ----------- |
   * | 0     | CLAMP_ADDRESSMODE  |             |
   * | 1     | WRAP_ADDRESSMODE   |             |
   * | 2     | MIRROR_ADDRESSMODE |             |
   */
  get wrapV() {
    return this._wrapV;
  }
  set wrapV(e) {
    this._wrapV = e;
  }
  /**
   * How a texture is mapped.
   * Unused in thin texture mode.
   */
  get coordinatesMode() {
    return 0;
  }
  /**
   * Define if the texture is a cube texture or if false a 2d texture.
   */
  get isCube() {
    return this._texture ? this._texture.isCube : !1;
  }
  set isCube(e) {
    this._texture && (this._texture.isCube = e);
  }
  /**
   * Define if the texture is a 3d texture (webgl 2) or if false a 2d texture.
   */
  get is3D() {
    return this._texture ? this._texture.is3D : !1;
  }
  set is3D(e) {
    this._texture && (this._texture.is3D = e);
  }
  /**
   * Define if the texture is a 2d array texture (webgl 2) or if false a 2d texture.
   */
  get is2DArray() {
    return this._texture ? this._texture.is2DArray : !1;
  }
  set is2DArray(e) {
    this._texture && (this._texture.is2DArray = e);
  }
  /**
   * Get the class name of the texture.
   * @returns "ThinTexture"
   */
  getClassName() {
    return "ThinTexture";
  }
  static _IsRenderTargetWrapper(e) {
    return (e == null ? void 0 : e._shareDepth) !== void 0;
  }
  /**
   * Instantiates a new ThinTexture.
   * Base class of all the textures in babylon.
   * This can be used as an internal texture wrapper in ThinEngine to benefit from the cache
   * @param internalTexture Define the internalTexture to wrap. You can also pass a RenderTargetWrapper, in which case the texture will be the render target's texture
   */
  constructor(e) {
    this._wrapU = 1, this._wrapV = 1, this.wrapR = 1, this.anisotropicFilteringLevel = 4, this.delayLoadState = 0, this._texture = null, this._engine = null, this._cachedSize = He.Zero(), this._cachedBaseSize = He.Zero(), this._initialSamplingMode = 2, this._texture = ci._IsRenderTargetWrapper(e) ? e.texture : e, this._texture && (this._engine = this._texture.getEngine());
  }
  /**
   * Get if the texture is ready to be used (downloaded, converted, mip mapped...).
   * @returns true if fully ready
   */
  isReady() {
    return this.delayLoadState === 4 ? (this.delayLoad(), !1) : this._texture ? this._texture.isReady : !1;
  }
  /**
   * Triggers the load sequence in delayed load mode.
   */
  delayLoad() {
  }
  /**
   * Get the underlying lower level texture from Babylon.
   * @returns the internal texture
   */
  getInternalTexture() {
    return this._texture;
  }
  /**
   * Get the size of the texture.
   * @returns the texture size.
   */
  getSize() {
    if (this._texture) {
      if (this._texture.width)
        return this._cachedSize.width = this._texture.width, this._cachedSize.height = this._texture.height, this._cachedSize;
      if (this._texture._size)
        return this._cachedSize.width = this._texture._size, this._cachedSize.height = this._texture._size, this._cachedSize;
    }
    return this._cachedSize;
  }
  /**
   * Get the base size of the texture.
   * It can be different from the size if the texture has been resized for POT for instance
   * @returns the base size
   */
  getBaseSize() {
    return !this.isReady() || !this._texture ? (this._cachedBaseSize.width = 0, this._cachedBaseSize.height = 0, this._cachedBaseSize) : this._texture._size ? (this._cachedBaseSize.width = this._texture._size, this._cachedBaseSize.height = this._texture._size, this._cachedBaseSize) : (this._cachedBaseSize.width = this._texture.baseWidth, this._cachedBaseSize.height = this._texture.baseHeight, this._cachedBaseSize);
  }
  /**
   * Get the current sampling mode associated with the texture.
   */
  get samplingMode() {
    return this._texture ? this._texture.samplingMode : this._initialSamplingMode;
  }
  /**
   * Update the sampling mode of the texture.
   * Default is Trilinear mode.
   *
   * | Value | Type               | Description |
   * | ----- | ------------------ | ----------- |
   * | 1     | NEAREST_SAMPLINGMODE or NEAREST_NEAREST_MIPLINEAR  | Nearest is: mag = nearest, min = nearest, mip = linear |
   * | 2     | BILINEAR_SAMPLINGMODE or LINEAR_LINEAR_MIPNEAREST | Bilinear is: mag = linear, min = linear, mip = nearest |
   * | 3     | TRILINEAR_SAMPLINGMODE or LINEAR_LINEAR_MIPLINEAR | Trilinear is: mag = linear, min = linear, mip = linear |
   * | 4     | NEAREST_NEAREST_MIPNEAREST |             |
   * | 5    | NEAREST_LINEAR_MIPNEAREST |             |
   * | 6    | NEAREST_LINEAR_MIPLINEAR |             |
   * | 7    | NEAREST_LINEAR |             |
   * | 8    | NEAREST_NEAREST |             |
   * | 9   | LINEAR_NEAREST_MIPNEAREST |             |
   * | 10   | LINEAR_NEAREST_MIPLINEAR |             |
   * | 11   | LINEAR_LINEAR |             |
   * | 12   | LINEAR_NEAREST |             |
   *
   *    > _mag_: magnification filter (close to the viewer)
   *    > _min_: minification filter (far from the viewer)
   *    > _mip_: filter used between mip map levels
   *@param samplingMode Define the new sampling mode of the texture
   */
  updateSamplingMode(e) {
    this._texture && this._engine && this._engine.updateTextureSamplingMode(e, this._texture);
  }
  /**
   * Release and destroy the underlying lower level texture aka internalTexture.
   */
  releaseInternalTexture() {
    this._texture && (this._texture.dispose(), this._texture = null);
  }
  /**
   * Dispose the texture and release its associated resources.
   */
  dispose() {
    this._texture && (this.releaseInternalTexture(), this._engine = null);
  }
}
class Q extends ci {
  /**
   * Define if the texture is having a usable alpha value (can be use for transparency or glossiness for instance).
   */
  set hasAlpha(e) {
    this._hasAlpha !== e && (this._hasAlpha = e, this._scene && this._scene.markAllMaterialsAsDirty(1, (t) => t.hasTexture(this)));
  }
  get hasAlpha() {
    return this._hasAlpha;
  }
  /**
   * Defines if the alpha value should be determined via the rgb values.
   * If true the luminance of the pixel might be used to find the corresponding alpha value.
   */
  set getAlphaFromRGB(e) {
    this._getAlphaFromRGB !== e && (this._getAlphaFromRGB = e, this._scene && this._scene.markAllMaterialsAsDirty(1, (t) => t.hasTexture(this)));
  }
  get getAlphaFromRGB() {
    return this._getAlphaFromRGB;
  }
  /**
   * Define the UV channel to use starting from 0 and defaulting to 0.
   * This is part of the texture as textures usually maps to one uv set.
   */
  set coordinatesIndex(e) {
    this._coordinatesIndex !== e && (this._coordinatesIndex = e, this._scene && this._scene.markAllMaterialsAsDirty(1, (t) => t.hasTexture(this)));
  }
  get coordinatesIndex() {
    return this._coordinatesIndex;
  }
  /**
   * How a texture is mapped.
   *
   * | Value | Type                                | Description |
   * | ----- | ----------------------------------- | ----------- |
   * | 0     | EXPLICIT_MODE                       |             |
   * | 1     | SPHERICAL_MODE                      |             |
   * | 2     | PLANAR_MODE                         |             |
   * | 3     | CUBIC_MODE                          |             |
   * | 4     | PROJECTION_MODE                     |             |
   * | 5     | SKYBOX_MODE                         |             |
   * | 6     | INVCUBIC_MODE                       |             |
   * | 7     | EQUIRECTANGULAR_MODE                |             |
   * | 8     | FIXED_EQUIRECTANGULAR_MODE          |             |
   * | 9     | FIXED_EQUIRECTANGULAR_MIRRORED_MODE |             |
   */
  set coordinatesMode(e) {
    this._coordinatesMode !== e && (this._coordinatesMode = e, this._scene && this._scene.markAllMaterialsAsDirty(1, (t) => t.hasTexture(this)));
  }
  get coordinatesMode() {
    return this._coordinatesMode;
  }
  /**
   * | Value | Type               | Description |
   * | ----- | ------------------ | ----------- |
   * | 0     | CLAMP_ADDRESSMODE  |             |
   * | 1     | WRAP_ADDRESSMODE   |             |
   * | 2     | MIRROR_ADDRESSMODE |             |
   */
  get wrapU() {
    return this._wrapU;
  }
  set wrapU(e) {
    this._wrapU = e;
  }
  /**
   * | Value | Type               | Description |
   * | ----- | ------------------ | ----------- |
   * | 0     | CLAMP_ADDRESSMODE  |             |
   * | 1     | WRAP_ADDRESSMODE   |             |
   * | 2     | MIRROR_ADDRESSMODE |             |
   */
  get wrapV() {
    return this._wrapV;
  }
  set wrapV(e) {
    this._wrapV = e;
  }
  /**
   * Define if the texture is a cube texture or if false a 2d texture.
   */
  get isCube() {
    return this._texture ? this._texture.isCube : this._isCube;
  }
  set isCube(e) {
    this._texture ? this._texture.isCube = e : this._isCube = e;
  }
  /**
   * Define if the texture is a 3d texture (webgl 2) or if false a 2d texture.
   */
  get is3D() {
    return this._texture ? this._texture.is3D : !1;
  }
  set is3D(e) {
    this._texture && (this._texture.is3D = e);
  }
  /**
   * Define if the texture is a 2d array texture (webgl 2) or if false a 2d texture.
   */
  get is2DArray() {
    return this._texture ? this._texture.is2DArray : !1;
  }
  set is2DArray(e) {
    this._texture && (this._texture.is2DArray = e);
  }
  /**
   * Define if the texture contains data in gamma space (most of the png/jpg aside bump).
   * HDR texture are usually stored in linear space.
   * This only impacts the PBR and Background materials
   */
  get gammaSpace() {
    if (this._texture)
      this._texture._gammaSpace === null && (this._texture._gammaSpace = this._gammaSpace);
    else
      return this._gammaSpace;
    return this._texture._gammaSpace && !this._texture._useSRGBBuffer;
  }
  set gammaSpace(e) {
    if (this._texture) {
      if (this._texture._gammaSpace === e)
        return;
      this._texture._gammaSpace = e;
    } else {
      if (this._gammaSpace === e)
        return;
      this._gammaSpace = e;
    }
    this._markAllSubMeshesAsTexturesDirty();
  }
  /**
   * Gets or sets whether or not the texture contains RGBD data.
   */
  get isRGBD() {
    return this._texture != null && this._texture._isRGBD;
  }
  set isRGBD(e) {
    this._texture && (this._texture._isRGBD = e);
  }
  /**
   * Are mip maps generated for this texture or not.
   */
  get noMipmap() {
    return !1;
  }
  /**
   * With prefiltered texture, defined the offset used during the prefiltering steps.
   */
  get lodGenerationOffset() {
    return this._texture ? this._texture._lodGenerationOffset : 0;
  }
  set lodGenerationOffset(e) {
    this._texture && (this._texture._lodGenerationOffset = e);
  }
  /**
   * With prefiltered texture, defined the scale used during the prefiltering steps.
   */
  get lodGenerationScale() {
    return this._texture ? this._texture._lodGenerationScale : 0;
  }
  set lodGenerationScale(e) {
    this._texture && (this._texture._lodGenerationScale = e);
  }
  /**
   * With prefiltered texture, defined if the specular generation is based on a linear ramp.
   * By default we are using a log2 of the linear roughness helping to keep a better resolution for
   * average roughness values.
   */
  get linearSpecularLOD() {
    return this._texture ? this._texture._linearSpecularLOD : !1;
  }
  set linearSpecularLOD(e) {
    this._texture && (this._texture._linearSpecularLOD = e);
  }
  /**
   * In case a better definition than spherical harmonics is required for the diffuse part of the environment.
   * You can set the irradiance texture to rely on a texture instead of the spherical approach.
   * This texture need to have the same characteristics than its parent (Cube vs 2d, coordinates mode, Gamma/Linear, RGBD).
   */
  get irradianceTexture() {
    return this._texture ? this._texture._irradianceTexture : null;
  }
  set irradianceTexture(e) {
    this._texture && (this._texture._irradianceTexture = e);
  }
  /**
   * Define the unique id of the texture in the scene.
   */
  get uid() {
    return this._uid || (this._uid = Oi()), this._uid;
  }
  /**
   * Return a string representation of the texture.
   * @returns the texture as a string
   */
  toString() {
    return this.name;
  }
  /**
   * Get the class name of the texture.
   * @returns "BaseTexture"
   */
  getClassName() {
    return "BaseTexture";
  }
  /**
   * Callback triggered when the texture has been disposed.
   * Kept for back compatibility, you can use the onDisposeObservable instead.
   */
  set onDispose(e) {
    this._onDisposeObserver && this.onDisposeObservable.remove(this._onDisposeObserver), this._onDisposeObserver = this.onDisposeObservable.add(e);
  }
  /**
   * Define if the texture is preventing a material to render or not.
   * If not and the texture is not ready, the engine will use a default black texture instead.
   */
  get isBlocking() {
    return !0;
  }
  /**
   * Was there any loading error?
   */
  get loadingError() {
    return this._loadingError;
  }
  /**
   * If a loading error occurred this object will be populated with information about the error.
   */
  get errorObject() {
    return this._errorObject;
  }
  /**
   * Instantiates a new BaseTexture.
   * Base class of all the textures in babylon.
   * It groups all the common properties the materials, post process, lights... might need
   * in order to make a correct use of the texture.
   * @param sceneOrEngine Define the scene or engine the texture belongs to
   * @param internalTexture Define the internal texture associated with the texture
   */
  constructor(e, t = null) {
    super(null), this.metadata = null, this.reservedDataStore = null, this._hasAlpha = !1, this._getAlphaFromRGB = !1, this.level = 1, this._coordinatesIndex = 0, this.optimizeUVAllocation = !0, this._coordinatesMode = 0, this.wrapR = 1, this.anisotropicFilteringLevel = Q.DEFAULT_ANISOTROPIC_FILTERING_LEVEL, this._isCube = !1, this._gammaSpace = !0, this.invertZ = !1, this.lodLevelInAlpha = !1, this.isRenderTarget = !1, this._prefiltered = !1, this._forceSerialize = !1, this.animations = new Array(), this.onDisposeObservable = new $(), this._onDisposeObserver = null, this._scene = null, this._uid = null, this._parentContainer = null, this._loadingError = !1, e ? Q._IsScene(e) ? this._scene = e : this._engine = e : this._scene = oi.LastCreatedScene, this._scene && (this.uniqueId = this._scene.getUniqueId(), this._scene.addTexture(this), this._engine = this._scene.getEngine()), this._texture = t, this._uid = null;
  }
  /**
   * Get the scene the texture belongs to.
   * @returns the scene or null if undefined
   */
  getScene() {
    return this._scene;
  }
  /** @internal */
  _getEngine() {
    return this._engine;
  }
  /**
   * Checks if the texture has the same transform matrix than another texture
   * @param texture texture to check against
   * @returns true if the transforms are the same, else false
   */
  checkTransformsAreIdentical(e) {
    return e !== null;
  }
  /**
   * Get the texture transform matrix used to offset tile the texture for instance.
   * @returns the transformation matrix
   */
  getTextureMatrix() {
    return B.IdentityReadOnly;
  }
  /**
   * Get the texture reflection matrix used to rotate/transform the reflection.
   * @returns the reflection matrix
   */
  getReflectionTextureMatrix() {
    return B.IdentityReadOnly;
  }
  /**
   * Get if the texture is ready to be consumed (either it is ready or it is not blocking)
   * @returns true if ready, not blocking or if there was an error loading the texture
   */
  isReadyOrNotBlocking() {
    return !this.isBlocking || this.isReady() || this.loadingError;
  }
  /**
   * Scales the texture if is `canRescale()`
   * @param ratio the resize factor we want to use to rescale
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  scale(e) {
  }
  /**
   * Get if the texture can rescale.
   */
  get canRescale() {
    return !1;
  }
  /**
   * @internal
   */
  _getFromCache(e, t, i, r, s, n) {
    const o = this._getEngine();
    if (!o)
      return null;
    const a = o._getUseSRGBBuffer(!!s, t), f = o.getLoadedTexturesCache();
    for (let c = 0; c < f.length; c++) {
      const d = f[c];
      if ((s === void 0 || a === d._useSRGBBuffer) && (r === void 0 || r === d.invertY) && d.url === e && d.generateMipMaps === !t && (!i || i === d.samplingMode) && (n === void 0 || n === d.isCube))
        return d.incrementReferences(), d;
    }
    return null;
  }
  /** @internal */
  _rebuild() {
  }
  /**
   * Clones the texture.
   * @returns the cloned texture
   */
  clone() {
    return null;
  }
  /**
   * Get the texture underlying type (INT, FLOAT...)
   */
  get textureType() {
    return this._texture && this._texture.type !== void 0 ? this._texture.type : 0;
  }
  /**
   * Get the texture underlying format (RGB, RGBA...)
   */
  get textureFormat() {
    return this._texture && this._texture.format !== void 0 ? this._texture.format : 5;
  }
  /**
   * Indicates that textures need to be re-calculated for all materials
   */
  _markAllSubMeshesAsTexturesDirty() {
    const e = this.getScene();
    e && e.markAllMaterialsAsDirty(1);
  }
  /**
   * Reads the pixels stored in the webgl texture and returns them as an ArrayBuffer.
   * This will returns an RGBA array buffer containing either in values (0-255) or
   * float values (0-1) depending of the underlying buffer type.
   * @param faceIndex defines the face of the texture to read (in case of cube texture)
   * @param level defines the LOD level of the texture to read (in case of Mip Maps)
   * @param buffer defines a user defined buffer to fill with data (can be null)
   * @param flushRenderer true to flush the renderer from the pending commands before reading the pixels
   * @param noDataConversion false to convert the data to Uint8Array (if texture type is UNSIGNED_BYTE) or to Float32Array (if texture type is anything but UNSIGNED_BYTE). If true, the type of the generated buffer (if buffer==null) will depend on the type of the texture
   * @param x defines the region x coordinates to start reading from (default to 0)
   * @param y defines the region y coordinates to start reading from (default to 0)
   * @param width defines the region width to read from (default to the texture size at level)
   * @param height defines the region width to read from (default to the texture size at level)
   * @returns The Array buffer promise containing the pixels data.
   */
  readPixels(e = 0, t = 0, i = null, r = !0, s = !1, n = 0, o = 0, a = Number.MAX_VALUE, f = Number.MAX_VALUE) {
    if (!this._texture)
      return null;
    const c = this._getEngine();
    if (!c)
      return null;
    const d = this.getSize();
    let E = d.width, u = d.height;
    t !== 0 && (E = E / Math.pow(2, t), u = u / Math.pow(2, t), E = Math.round(E), u = Math.round(u)), a = Math.min(E, a), f = Math.min(u, f);
    try {
      return this._texture.isCube ? c._readTexturePixels(this._texture, a, f, e, t, i, r, s, n, o) : c._readTexturePixels(this._texture, a, f, -1, t, i, r, s, n, o);
    } catch {
      return null;
    }
  }
  /**
   * @internal
   */
  _readPixelsSync(e = 0, t = 0, i = null, r = !0, s = !1) {
    if (!this._texture)
      return null;
    const n = this.getSize();
    let o = n.width, a = n.height;
    const f = this._getEngine();
    if (!f)
      return null;
    t != 0 && (o = o / Math.pow(2, t), a = a / Math.pow(2, t), o = Math.round(o), a = Math.round(a));
    try {
      return this._texture.isCube ? f._readTexturePixelsSync(this._texture, o, a, e, t, i, r, s) : f._readTexturePixelsSync(this._texture, o, a, -1, t, i, r, s);
    } catch {
      return null;
    }
  }
  /** @internal */
  get _lodTextureHigh() {
    return this._texture ? this._texture._lodTextureHigh : null;
  }
  /** @internal */
  get _lodTextureMid() {
    return this._texture ? this._texture._lodTextureMid : null;
  }
  /** @internal */
  get _lodTextureLow() {
    return this._texture ? this._texture._lodTextureLow : null;
  }
  /**
   * Dispose the texture and release its associated resources.
   */
  dispose() {
    if (this._scene) {
      this._scene.stopAnimation && this._scene.stopAnimation(this), this._scene.removePendingData(this);
      const e = this._scene.textures.indexOf(this);
      if (e >= 0 && this._scene.textures.splice(e, 1), this._scene.onTextureRemovedObservable.notifyObservers(this), this._scene = null, this._parentContainer) {
        const t = this._parentContainer.textures.indexOf(this);
        t > -1 && this._parentContainer.textures.splice(t, 1), this._parentContainer = null;
      }
    }
    this.onDisposeObservable.notifyObservers(this), this.onDisposeObservable.clear(), this.metadata = null, super.dispose();
  }
  /**
   * Serialize the texture into a JSON representation that can be parsed later on.
   * @param allowEmptyName True to force serialization even if name is empty. Default: false
   * @returns the JSON representation of the texture
   */
  serialize(e = !1) {
    if (!this.name && !e)
      return null;
    const t = j.Serialize(this);
    return j.AppendSerializedAnimations(this, t), t;
  }
  /**
   * Helper function to be called back once a list of texture contains only ready textures.
   * @param textures Define the list of textures to wait for
   * @param callback Define the callback triggered once the entire list will be ready
   */
  static WhenAllReady(e, t) {
    let i = e.length;
    if (i === 0) {
      t();
      return;
    }
    for (let r = 0; r < e.length; r++) {
      const s = e[r];
      if (s.isReady())
        --i === 0 && t();
      else {
        const n = s.onLoadObservable;
        n ? n.addOnce(() => {
          --i === 0 && t();
        }) : --i === 0 && t();
      }
    }
  }
  static _IsScene(e) {
    return e.getClassName() === "Scene";
  }
}
Q.DEFAULT_ANISOTROPIC_FILTERING_LEVEL = 4;
h([
  T()
], Q.prototype, "uniqueId", void 0);
h([
  T()
], Q.prototype, "name", void 0);
h([
  T()
], Q.prototype, "metadata", void 0);
h([
  T("hasAlpha")
], Q.prototype, "_hasAlpha", void 0);
h([
  T("getAlphaFromRGB")
], Q.prototype, "_getAlphaFromRGB", void 0);
h([
  T()
], Q.prototype, "level", void 0);
h([
  T("coordinatesIndex")
], Q.prototype, "_coordinatesIndex", void 0);
h([
  T()
], Q.prototype, "optimizeUVAllocation", void 0);
h([
  T("coordinatesMode")
], Q.prototype, "_coordinatesMode", void 0);
h([
  T()
], Q.prototype, "wrapU", null);
h([
  T()
], Q.prototype, "wrapV", null);
h([
  T()
], Q.prototype, "wrapR", void 0);
h([
  T()
], Q.prototype, "anisotropicFilteringLevel", void 0);
h([
  T()
], Q.prototype, "isCube", null);
h([
  T()
], Q.prototype, "is3D", null);
h([
  T()
], Q.prototype, "is2DArray", null);
h([
  T()
], Q.prototype, "gammaSpace", null);
h([
  T()
], Q.prototype, "invertZ", void 0);
h([
  T()
], Q.prototype, "lodLevelInAlpha", void 0);
h([
  T()
], Q.prototype, "lodGenerationOffset", null);
h([
  T()
], Q.prototype, "lodGenerationScale", null);
h([
  T()
], Q.prototype, "linearSpecularLOD", null);
h([
  z()
], Q.prototype, "irradianceTexture", null);
h([
  T()
], Q.prototype, "isRenderTarget", void 0);
function Fi(l, e, t = !1) {
  const i = e.width, r = e.height;
  if (l instanceof Float32Array) {
    let f = l.byteLength / l.BYTES_PER_ELEMENT;
    const c = new Uint8Array(f);
    for (; --f >= 0; ) {
      let d = l[f];
      d < 0 ? d = 0 : d > 1 && (d = 1), c[f] = d * 255;
    }
    l = c;
  }
  const s = document.createElement("canvas");
  s.width = i, s.height = r;
  const n = s.getContext("2d");
  if (!n)
    return null;
  const o = n.createImageData(i, r);
  if (o.data.set(l), n.putImageData(o, 0, 0), t) {
    const f = document.createElement("canvas");
    f.width = i, f.height = r;
    const c = f.getContext("2d");
    return c ? (c.translate(0, r), c.scale(1, -1), c.drawImage(s, 0, 0), f.toDataURL("image/png")) : null;
  }
  return s.toDataURL("image/png");
}
function ur(l, e = 0, t = 0) {
  const i = l.getInternalTexture();
  if (!i)
    return null;
  const r = l._readPixelsSync(e, t);
  return r ? Fi(r, l.getSize(), i.invertY) : null;
}
async function Er(l, e = 0, t = 0) {
  const i = l.getInternalTexture();
  if (!i)
    return null;
  const r = await l.readPixels(e, t);
  return r ? Fi(r, l.getSize(), i.invertY) : null;
}
class I extends Q {
  /**
   * Are mip maps generated for this texture or not.
   */
  get noMipmap() {
    return this._noMipmap;
  }
  /** Returns the texture mime type if it was defined by a loader (undefined else) */
  get mimeType() {
    return this._mimeType;
  }
  /**
   * Is the texture preventing material to render while loading.
   * If false, a default texture will be used instead of the loading one during the preparation step.
   */
  set isBlocking(e) {
    this._isBlocking = e;
  }
  get isBlocking() {
    return this._isBlocking;
  }
  /**
   * Gets a boolean indicating if the texture needs to be inverted on the y axis during loading
   */
  get invertY() {
    return this._invertY;
  }
  /**
   * Instantiates a new texture.
   * This represents a texture in babylon. It can be easily loaded from a network, base64 or html input.
   * @see https://doc.babylonjs.com/features/featuresDeepDive/materials/using/materials_introduction#texture
   * @param url defines the url of the picture to load as a texture
   * @param sceneOrEngine defines the scene or engine the texture will belong to
   * @param noMipmapOrOptions defines if the texture will require mip maps or not or set of all options to create the texture
   * @param invertY defines if the texture needs to be inverted on the y axis during loading
   * @param samplingMode defines the sampling mode we want for the texture while fetching from it (Texture.NEAREST_SAMPLINGMODE...)
   * @param onLoad defines a callback triggered when the texture has been loaded
   * @param onError defines a callback triggered when an error occurred during the loading session
   * @param buffer defines the buffer to load the texture from in case the texture is loaded from a buffer representation
   * @param deleteBuffer defines if the buffer we are loading the texture from should be deleted after load
   * @param format defines the format of the texture we are trying to load (Engine.TEXTUREFORMAT_RGBA...)
   * @param mimeType defines an optional mime type information
   * @param loaderOptions options to be passed to the loader
   * @param creationFlags specific flags to use when creating the texture (1 for storage textures, for eg)
   * @param forcedExtension defines the extension to use to pick the right loader
   */
  constructor(e, t, i, r, s = I.TRILINEAR_SAMPLINGMODE, n = null, o = null, a = null, f = !1, c, d, E, u, _) {
    var p, A, R, N, O, L, U, y, D;
    super(t), this.url = null, this.uOffset = 0, this.vOffset = 0, this.uScale = 1, this.vScale = 1, this.uAng = 0, this.vAng = 0, this.wAng = 0, this.uRotationCenter = 0.5, this.vRotationCenter = 0.5, this.wRotationCenter = 0.5, this.homogeneousRotationInUVTransform = !1, this.inspectableCustomProperties = null, this._noMipmap = !1, this._invertY = !1, this._rowGenerationMatrix = null, this._cachedTextureMatrix = null, this._projectionModeMatrix = null, this._t0 = null, this._t1 = null, this._t2 = null, this._cachedUOffset = -1, this._cachedVOffset = -1, this._cachedUScale = 0, this._cachedVScale = 0, this._cachedUAng = -1, this._cachedVAng = -1, this._cachedWAng = -1, this._cachedReflectionProjectionMatrixId = -1, this._cachedURotationCenter = -1, this._cachedVRotationCenter = -1, this._cachedWRotationCenter = -1, this._cachedHomogeneousRotationInUVTransform = !1, this._cachedReflectionTextureMatrix = null, this._cachedReflectionUOffset = -1, this._cachedReflectionVOffset = -1, this._cachedReflectionUScale = 0, this._cachedReflectionVScale = 0, this._cachedReflectionCoordinatesMode = -1, this._buffer = null, this._deleteBuffer = !1, this._format = null, this._delayedOnLoad = null, this._delayedOnError = null, this.onLoadObservable = new $(), this._isBlocking = !0, this.name = e || "", this.url = e;
    let w, X = !1, H = null;
    typeof i == "object" && i !== null ? (w = (p = i.noMipmap) !== null && p !== void 0 ? p : !1, r = (A = i.invertY) !== null && A !== void 0 ? A : !ft.UseOpenGLOrientationForUV, s = (R = i.samplingMode) !== null && R !== void 0 ? R : I.TRILINEAR_SAMPLINGMODE, n = (N = i.onLoad) !== null && N !== void 0 ? N : null, o = (O = i.onError) !== null && O !== void 0 ? O : null, a = (L = i.buffer) !== null && L !== void 0 ? L : null, f = (U = i.deleteBuffer) !== null && U !== void 0 ? U : !1, c = i.format, d = i.mimeType, E = i.loaderOptions, u = i.creationFlags, X = (y = i.useSRGBBuffer) !== null && y !== void 0 ? y : !1, H = (D = i.internalTexture) !== null && D !== void 0 ? D : null) : w = !!i, this._noMipmap = w, this._invertY = r === void 0 ? !ft.UseOpenGLOrientationForUV : r, this._initialSamplingMode = s, this._buffer = a, this._deleteBuffer = f, this._mimeType = d, this._loaderOptions = E, this._creationFlags = u, this._useSRGBBuffer = X, this._forcedExtension = _, c && (this._format = c);
    const Ae = this.getScene(), ee = this._getEngine();
    if (!ee)
      return;
    ee.onBeforeTextureInitObservable.notifyObservers(this);
    const ge = () => {
      this._texture && (this._texture._invertVScale && (this.vScale *= -1, this.vOffset += 1), this._texture._cachedWrapU !== null && (this.wrapU = this._texture._cachedWrapU, this._texture._cachedWrapU = null), this._texture._cachedWrapV !== null && (this.wrapV = this._texture._cachedWrapV, this._texture._cachedWrapV = null), this._texture._cachedWrapR !== null && (this.wrapR = this._texture._cachedWrapR, this._texture._cachedWrapR = null)), this.onLoadObservable.hasObservers() && this.onLoadObservable.notifyObservers(this), n && n(), !this.isBlocking && Ae && Ae.resetCachedMaterial();
    }, xe = (fe, Le) => {
      this._loadingError = !0, this._errorObject = { message: fe, exception: Le }, o && o(fe, Le), I.OnTextureLoadErrorObservable.notifyObservers(this);
    };
    if (!this.url && !H) {
      this._delayedOnLoad = ge, this._delayedOnError = xe;
      return;
    }
    if (this._texture = H ?? this._getFromCache(this.url, w, s, this._invertY, X), this._texture)
      if (this._texture.isReady)
        _i.SetImmediate(() => ge());
      else {
        const fe = this._texture.onLoadedObservable.add(ge);
        this._texture.onErrorObservable.add((Le) => {
          var Yt;
          xe(Le.message, Le.exception), (Yt = this._texture) === null || Yt === void 0 || Yt.onLoadedObservable.remove(fe);
        });
      }
    else if (!Ae || !Ae.useDelayedTextureLoading) {
      try {
        this._texture = ee.createTexture(this.url, w, this._invertY, Ae, s, ge, xe, this._buffer, void 0, this._format, this._forcedExtension, d, E, u, X);
      } catch (fe) {
        throw xe("error loading", fe), fe;
      }
      f && (this._buffer = null);
    } else
      this.delayLoadState = 4, this._delayedOnLoad = ge, this._delayedOnError = xe;
  }
  /**
   * Update the url (and optional buffer) of this texture if url was null during construction.
   * @param url the url of the texture
   * @param buffer the buffer of the texture (defaults to null)
   * @param onLoad callback called when the texture is loaded  (defaults to null)
   * @param forcedExtension defines the extension to use to pick the right loader
   */
  updateURL(e, t = null, i, r) {
    this.url && (this.releaseInternalTexture(), this.getScene().markAllMaterialsAsDirty(1)), (!this.name || this.name.startsWith("data:")) && (this.name = e), this.url = e, this._buffer = t, this._forcedExtension = r, this.delayLoadState = 4, i && (this._delayedOnLoad = i), this.delayLoad();
  }
  /**
   * Finish the loading sequence of a texture flagged as delayed load.
   * @internal
   */
  delayLoad() {
    if (this.delayLoadState !== 4)
      return;
    const e = this.getScene();
    e && (this.delayLoadState = 1, this._texture = this._getFromCache(this.url, this._noMipmap, this.samplingMode, this._invertY, this._useSRGBBuffer), this._texture ? this._delayedOnLoad && (this._texture.isReady ? _i.SetImmediate(this._delayedOnLoad) : this._texture.onLoadedObservable.add(this._delayedOnLoad)) : (this._texture = e.getEngine().createTexture(this.url, this._noMipmap, this._invertY, e, this.samplingMode, this._delayedOnLoad, this._delayedOnError, this._buffer, null, this._format, this._forcedExtension, this._mimeType, this._loaderOptions, this._creationFlags, this._useSRGBBuffer), this._deleteBuffer && (this._buffer = null)), this._delayedOnLoad = null, this._delayedOnError = null);
  }
  _prepareRowForTextureGeneration(e, t, i, r) {
    e *= this._cachedUScale, t *= this._cachedVScale, e -= this.uRotationCenter * this._cachedUScale, t -= this.vRotationCenter * this._cachedVScale, i -= this.wRotationCenter, g.TransformCoordinatesFromFloatsToRef(e, t, i, this._rowGenerationMatrix, r), r.x += this.uRotationCenter * this._cachedUScale + this._cachedUOffset, r.y += this.vRotationCenter * this._cachedVScale + this._cachedVOffset, r.z += this.wRotationCenter;
  }
  /**
   * Checks if the texture has the same transform matrix than another texture
   * @param texture texture to check against
   * @returns true if the transforms are the same, else false
   */
  checkTransformsAreIdentical(e) {
    return e !== null && this.uOffset === e.uOffset && this.vOffset === e.vOffset && this.uScale === e.uScale && this.vScale === e.vScale && this.uAng === e.uAng && this.vAng === e.vAng && this.wAng === e.wAng;
  }
  /**
   * Get the current texture matrix which includes the requested offsetting, tiling and rotation components.
   * @param uBase
   * @returns the transform matrix of the texture.
   */
  getTextureMatrix(e = 1) {
    if (this.uOffset === this._cachedUOffset && this.vOffset === this._cachedVOffset && this.uScale * e === this._cachedUScale && this.vScale === this._cachedVScale && this.uAng === this._cachedUAng && this.vAng === this._cachedVAng && this.wAng === this._cachedWAng && this.uRotationCenter === this._cachedURotationCenter && this.vRotationCenter === this._cachedVRotationCenter && this.wRotationCenter === this._cachedWRotationCenter && this.homogeneousRotationInUVTransform === this._cachedHomogeneousRotationInUVTransform)
      return this._cachedTextureMatrix;
    this._cachedUOffset = this.uOffset, this._cachedVOffset = this.vOffset, this._cachedUScale = this.uScale * e, this._cachedVScale = this.vScale, this._cachedUAng = this.uAng, this._cachedVAng = this.vAng, this._cachedWAng = this.wAng, this._cachedURotationCenter = this.uRotationCenter, this._cachedVRotationCenter = this.vRotationCenter, this._cachedWRotationCenter = this.wRotationCenter, this._cachedHomogeneousRotationInUVTransform = this.homogeneousRotationInUVTransform, (!this._cachedTextureMatrix || !this._rowGenerationMatrix) && (this._cachedTextureMatrix = B.Zero(), this._rowGenerationMatrix = new B(), this._t0 = g.Zero(), this._t1 = g.Zero(), this._t2 = g.Zero()), B.RotationYawPitchRollToRef(this.vAng, this.uAng, this.wAng, this._rowGenerationMatrix), this.homogeneousRotationInUVTransform ? (B.TranslationToRef(-this._cachedURotationCenter, -this._cachedVRotationCenter, -this._cachedWRotationCenter, G.Matrix[0]), B.TranslationToRef(this._cachedURotationCenter, this._cachedVRotationCenter, this._cachedWRotationCenter, G.Matrix[1]), B.ScalingToRef(this._cachedUScale, this._cachedVScale, 0, G.Matrix[2]), B.TranslationToRef(this._cachedUOffset, this._cachedVOffset, 0, G.Matrix[3]), G.Matrix[0].multiplyToRef(this._rowGenerationMatrix, this._cachedTextureMatrix), this._cachedTextureMatrix.multiplyToRef(G.Matrix[1], this._cachedTextureMatrix), this._cachedTextureMatrix.multiplyToRef(G.Matrix[2], this._cachedTextureMatrix), this._cachedTextureMatrix.multiplyToRef(G.Matrix[3], this._cachedTextureMatrix), this._cachedTextureMatrix.setRowFromFloats(2, this._cachedTextureMatrix.m[12], this._cachedTextureMatrix.m[13], this._cachedTextureMatrix.m[14], 1)) : (this._prepareRowForTextureGeneration(0, 0, 0, this._t0), this._prepareRowForTextureGeneration(1, 0, 0, this._t1), this._prepareRowForTextureGeneration(0, 1, 0, this._t2), this._t1.subtractInPlace(this._t0), this._t2.subtractInPlace(this._t0), B.FromValuesToRef(this._t1.x, this._t1.y, this._t1.z, 0, this._t2.x, this._t2.y, this._t2.z, 0, this._t0.x, this._t0.y, this._t0.z, 0, 0, 0, 0, 1, this._cachedTextureMatrix));
    const t = this.getScene();
    return t ? (this.optimizeUVAllocation && t.markAllMaterialsAsDirty(1, (i) => i.hasTexture(this)), this._cachedTextureMatrix) : this._cachedTextureMatrix;
  }
  /**
   * Get the current matrix used to apply reflection. This is useful to rotate an environment texture for instance.
   * @returns The reflection texture transform
   */
  getReflectionTextureMatrix() {
    const e = this.getScene();
    if (!e)
      return this._cachedReflectionTextureMatrix;
    if (this.uOffset === this._cachedReflectionUOffset && this.vOffset === this._cachedReflectionVOffset && this.uScale === this._cachedReflectionUScale && this.vScale === this._cachedReflectionVScale && this.coordinatesMode === this._cachedReflectionCoordinatesMode)
      if (this.coordinatesMode === I.PROJECTION_MODE) {
        if (this._cachedReflectionProjectionMatrixId === e.getProjectionMatrix().updateFlag)
          return this._cachedReflectionTextureMatrix;
      } else
        return this._cachedReflectionTextureMatrix;
    this._cachedReflectionTextureMatrix || (this._cachedReflectionTextureMatrix = B.Zero()), this._projectionModeMatrix || (this._projectionModeMatrix = B.Zero());
    const t = this._cachedReflectionCoordinatesMode !== this.coordinatesMode;
    switch (this._cachedReflectionUOffset = this.uOffset, this._cachedReflectionVOffset = this.vOffset, this._cachedReflectionUScale = this.uScale, this._cachedReflectionVScale = this.vScale, this._cachedReflectionCoordinatesMode = this.coordinatesMode, this.coordinatesMode) {
      case I.PLANAR_MODE: {
        B.IdentityToRef(this._cachedReflectionTextureMatrix), this._cachedReflectionTextureMatrix[0] = this.uScale, this._cachedReflectionTextureMatrix[5] = this.vScale, this._cachedReflectionTextureMatrix[12] = this.uOffset, this._cachedReflectionTextureMatrix[13] = this.vOffset;
        break;
      }
      case I.PROJECTION_MODE: {
        B.FromValuesToRef(0.5, 0, 0, 0, 0, -0.5, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 1, 1, this._projectionModeMatrix);
        const i = e.getProjectionMatrix();
        this._cachedReflectionProjectionMatrixId = i.updateFlag, i.multiplyToRef(this._projectionModeMatrix, this._cachedReflectionTextureMatrix);
        break;
      }
      default:
        B.IdentityToRef(this._cachedReflectionTextureMatrix);
        break;
    }
    return t && e.markAllMaterialsAsDirty(1, (i) => i.getActiveTextures().indexOf(this) !== -1), this._cachedReflectionTextureMatrix;
  }
  /**
   * Clones the texture.
   * @returns the cloned texture
   */
  clone() {
    const e = {
      noMipmap: this._noMipmap,
      invertY: this._invertY,
      samplingMode: this.samplingMode,
      onLoad: void 0,
      onError: void 0,
      buffer: this._texture ? this._texture._buffer : void 0,
      deleteBuffer: this._deleteBuffer,
      format: this.textureFormat,
      mimeType: this.mimeType,
      loaderOptions: this._loaderOptions,
      creationFlags: this._creationFlags,
      useSRGBBuffer: this._useSRGBBuffer
    };
    return j.Clone(() => new I(this._texture ? this._texture.url : null, this.getScene(), e), this);
  }
  /**
   * Serialize the texture to a JSON representation we can easily use in the respective Parse function.
   * @returns The JSON representation of the texture
   */
  serialize() {
    var e, t;
    const i = this.name;
    I.SerializeBuffers || this.name.startsWith("data:") && (this.name = ""), this.name.startsWith("data:") && this.url === this.name && (this.url = "");
    const r = super.serialize(I._SerializeInternalTextureUniqueId);
    return r ? ((I.SerializeBuffers || I.ForceSerializeBuffers) && (typeof this._buffer == "string" && this._buffer.substr(0, 5) === "data:" ? (r.base64String = this._buffer, r.name = r.name.replace("data:", "")) : this.url && this.url.startsWith("data:") && this._buffer instanceof Uint8Array ? r.base64String = "data:image/png;base64," + ji(this._buffer) : (I.ForceSerializeBuffers || this.url && this.url.startsWith("blob:") || this._forceSerialize) && (r.base64String = !this._engine || this._engine._features.supportSyncTextureRead ? ur(this) : Er(this))), r.invertY = this._invertY, r.samplingMode = this.samplingMode, r._creationFlags = this._creationFlags, r._useSRGBBuffer = this._useSRGBBuffer, I._SerializeInternalTextureUniqueId && (r.internalTextureUniqueId = (t = (e = this._texture) === null || e === void 0 ? void 0 : e.uniqueId) !== null && t !== void 0 ? t : void 0), this.name = i, r) : null;
  }
  /**
   * Get the current class name of the texture useful for serialization or dynamic coding.
   * @returns "Texture"
   */
  getClassName() {
    return "Texture";
  }
  /**
   * Dispose the texture and release its associated resources.
   */
  dispose() {
    super.dispose(), this.onLoadObservable.clear(), this._delayedOnLoad = null, this._delayedOnError = null, this._buffer = null;
  }
  /**
   * Parse the JSON representation of a texture in order to recreate the texture in the given scene.
   * @param parsedTexture Define the JSON representation of the texture
   * @param scene Define the scene the parsed texture should be instantiated in
   * @param rootUrl Define the root url of the parsing sequence in the case of relative dependencies
   * @returns The parsed texture if successful
   */
  static Parse(e, t, i) {
    if (e.customType) {
      const f = qi.Instantiate(e.customType).Parse(e, t, i);
      return e.samplingMode && f.updateSamplingMode && f._samplingMode && f._samplingMode !== e.samplingMode && f.updateSamplingMode(e.samplingMode), f;
    }
    if (e.isCube && !e.isRenderTarget)
      return I._CubeTextureParser(e, t, i);
    const r = e.internalTextureUniqueId !== void 0;
    if (!e.name && !e.isRenderTarget && !r)
      return null;
    let s;
    if (r) {
      const a = t.getEngine().getLoadedTexturesCache();
      for (const f of a)
        if (f.uniqueId === e.internalTextureUniqueId) {
          s = f;
          break;
        }
    }
    const n = (a) => {
      var f;
      if (a && a._texture && (a._texture._cachedWrapU = null, a._texture._cachedWrapV = null, a._texture._cachedWrapR = null), e.samplingMode) {
        const c = e.samplingMode;
        a && a.samplingMode !== c && a.updateSamplingMode(c);
      }
      if (a && e.animations)
        for (let c = 0; c < e.animations.length; c++) {
          const d = e.animations[c], E = Gt("BABYLON.Animation");
          E && a.animations.push(E.Parse(d));
        }
      r && !s && ((f = a == null ? void 0 : a._texture) === null || f === void 0 || f._setUniqueId(e.internalTextureUniqueId));
    };
    return j.Parse(() => {
      var a, f, c;
      let d = !0;
      if (e.noMipmap && (d = !1), e.mirrorPlane) {
        const E = I._CreateMirror(e.name, e.renderTargetSize, t, d);
        return E._waitingRenderList = e.renderList, E.mirrorPlane = Ji.FromArray(e.mirrorPlane), n(E), E;
      } else if (e.isRenderTarget) {
        let E = null;
        if (e.isCube) {
          if (t.reflectionProbes)
            for (let u = 0; u < t.reflectionProbes.length; u++) {
              const _ = t.reflectionProbes[u];
              if (_.name === e.name)
                return _.cubeTexture;
            }
        } else
          E = I._CreateRenderTargetTexture(e.name, e.renderTargetSize, t, d, (a = e._creationFlags) !== null && a !== void 0 ? a : 0), E._waitingRenderList = e.renderList;
        return n(E), E;
      } else {
        let E;
        if (e.base64String && !s)
          E = I.CreateFromBase64String(e.base64String, e.base64String, t, !d, e.invertY, e.samplingMode, () => {
            n(E);
          }, (f = e._creationFlags) !== null && f !== void 0 ? f : 0, (c = e._useSRGBBuffer) !== null && c !== void 0 ? c : !1), E.name = e.name;
        else {
          let u;
          e.name && e.name.indexOf("://") > 0 ? u = e.name : u = i + e.name, e.url && (e.url.startsWith("data:") || I.UseSerializedUrlIfAny) && (u = e.url);
          const _ = {
            noMipmap: !d,
            invertY: e.invertY,
            samplingMode: e.samplingMode,
            onLoad: () => {
              n(E);
            },
            internalTexture: s
          };
          E = new I(u, t, _);
        }
        return E;
      }
    }, e, t);
  }
  /**
   * Creates a texture from its base 64 representation.
   * @param data Define the base64 payload without the data: prefix
   * @param name Define the name of the texture in the scene useful fo caching purpose for instance
   * @param scene Define the scene the texture should belong to
   * @param noMipmapOrOptions defines if the texture will require mip maps or not or set of all options to create the texture
   * @param invertY define if the texture needs to be inverted on the y axis during loading
   * @param samplingMode define the sampling mode we want for the texture while fetching from it (Texture.NEAREST_SAMPLINGMODE...)
   * @param onLoad define a callback triggered when the texture has been loaded
   * @param onError define a callback triggered when an error occurred during the loading session
   * @param format define the format of the texture we are trying to load (Engine.TEXTUREFORMAT_RGBA...)
   * @param creationFlags specific flags to use when creating the texture (1 for storage textures, for eg)
   * @returns the created texture
   */
  static CreateFromBase64String(e, t, i, r, s, n = I.TRILINEAR_SAMPLINGMODE, o = null, a = null, f = 5, c) {
    return new I("data:" + t, i, r, s, n, o, a, e, !1, f, void 0, void 0, c);
  }
  /**
   * Creates a texture from its data: representation. (data: will be added in case only the payload has been passed in)
   * @param name Define the name of the texture in the scene useful fo caching purpose for instance
   * @param buffer define the buffer to load the texture from in case the texture is loaded from a buffer representation
   * @param scene Define the scene the texture should belong to
   * @param deleteBuffer define if the buffer we are loading the texture from should be deleted after load
   * @param noMipmapOrOptions defines if the texture will require mip maps or not or set of all options to create the texture
   * @param invertY define if the texture needs to be inverted on the y axis during loading
   * @param samplingMode define the sampling mode we want for the texture while fetching from it (Texture.NEAREST_SAMPLINGMODE...)
   * @param onLoad define a callback triggered when the texture has been loaded
   * @param onError define a callback triggered when an error occurred during the loading session
   * @param format define the format of the texture we are trying to load (Engine.TEXTUREFORMAT_RGBA...)
   * @param creationFlags specific flags to use when creating the texture (1 for storage textures, for eg)
   * @returns the created texture
   */
  static LoadFromDataString(e, t, i, r = !1, s, n = !0, o = I.TRILINEAR_SAMPLINGMODE, a = null, f = null, c = 5, d) {
    return e.substr(0, 5) !== "data:" && (e = "data:" + e), new I(e, i, s, n, o, a, f, t, r, c, void 0, void 0, d);
  }
}
I.SerializeBuffers = !0;
I.ForceSerializeBuffers = !1;
I.OnTextureLoadErrorObservable = new $();
I._SerializeInternalTextureUniqueId = !1;
I._CubeTextureParser = (l, e, t) => {
  throw pt("CubeTexture");
};
I._CreateMirror = (l, e, t, i) => {
  throw pt("MirrorTexture");
};
I._CreateRenderTargetTexture = (l, e, t, i, r) => {
  throw pt("RenderTargetTexture");
};
I.NEAREST_SAMPLINGMODE = 1;
I.NEAREST_NEAREST_MIPLINEAR = 8;
I.BILINEAR_SAMPLINGMODE = 2;
I.LINEAR_LINEAR_MIPNEAREST = 11;
I.TRILINEAR_SAMPLINGMODE = 3;
I.LINEAR_LINEAR_MIPLINEAR = 3;
I.NEAREST_NEAREST_MIPNEAREST = 4;
I.NEAREST_LINEAR_MIPNEAREST = 5;
I.NEAREST_LINEAR_MIPLINEAR = 6;
I.NEAREST_LINEAR = 7;
I.NEAREST_NEAREST = 1;
I.LINEAR_NEAREST_MIPNEAREST = 9;
I.LINEAR_NEAREST_MIPLINEAR = 10;
I.LINEAR_LINEAR = 2;
I.LINEAR_NEAREST = 12;
I.EXPLICIT_MODE = 0;
I.SPHERICAL_MODE = 1;
I.PLANAR_MODE = 2;
I.CUBIC_MODE = 3;
I.PROJECTION_MODE = 4;
I.SKYBOX_MODE = 5;
I.INVCUBIC_MODE = 6;
I.EQUIRECTANGULAR_MODE = 7;
I.FIXED_EQUIRECTANGULAR_MODE = 8;
I.FIXED_EQUIRECTANGULAR_MIRRORED_MODE = 9;
I.CLAMP_ADDRESSMODE = 0;
I.WRAP_ADDRESSMODE = 1;
I.MIRROR_ADDRESSMODE = 2;
I.UseSerializedUrlIfAny = !1;
h([
  T()
], I.prototype, "url", void 0);
h([
  T()
], I.prototype, "uOffset", void 0);
h([
  T()
], I.prototype, "vOffset", void 0);
h([
  T()
], I.prototype, "uScale", void 0);
h([
  T()
], I.prototype, "vScale", void 0);
h([
  T()
], I.prototype, "uAng", void 0);
h([
  T()
], I.prototype, "vAng", void 0);
h([
  T()
], I.prototype, "wAng", void 0);
h([
  T()
], I.prototype, "uRotationCenter", void 0);
h([
  T()
], I.prototype, "vRotationCenter", void 0);
h([
  T()
], I.prototype, "wRotationCenter", void 0);
h([
  T()
], I.prototype, "homogeneousRotationInUVTransform", void 0);
h([
  T()
], I.prototype, "isBlocking", null);
Fe("BABYLON.Texture", I);
j._TextureParser = I.Parse;
class _r {
  /**
   * Gets the depth/stencil texture (if created by a createDepthStencilTexture() call)
   */
  get depthStencilTexture() {
    return this._depthStencilTexture;
  }
  /**
   * Indicates if the depth/stencil texture has a stencil aspect
   */
  get depthStencilTextureWithStencil() {
    return this._depthStencilTextureWithStencil;
  }
  /**
   * Defines if the render target wrapper is for a cube texture or if false a 2d texture
   */
  get isCube() {
    return this._isCube;
  }
  /**
   * Defines if the render target wrapper is for a single or multi target render wrapper
   */
  get isMulti() {
    return this._isMulti;
  }
  /**
   * Defines if the render target wrapper is for a single or an array of textures
   */
  get is2DArray() {
    return this.layers > 0;
  }
  /**
   * Gets the size of the render target wrapper (used for cubes, as width=height in this case)
   */
  get size() {
    return this.width;
  }
  /**
   * Gets the width of the render target wrapper
   */
  get width() {
    return this._size.width || this._size;
  }
  /**
   * Gets the height of the render target wrapper
   */
  get height() {
    return this._size.height || this._size;
  }
  /**
   * Gets the number of layers of the render target wrapper (only used if is2DArray is true and wrapper is not a multi render target)
   */
  get layers() {
    return this._size.layers || 0;
  }
  /**
   * Gets the render texture. If this is a multi render target, gets the first texture
   */
  get texture() {
    var e, t;
    return (t = (e = this._textures) === null || e === void 0 ? void 0 : e[0]) !== null && t !== void 0 ? t : null;
  }
  /**
   * Gets the list of render textures. If we are not in a multi render target, the list will be null (use the texture getter instead)
   */
  get textures() {
    return this._textures;
  }
  /**
   * Gets the face indices that correspond to the list of render textures. If we are not in a multi render target, the list will be null
   */
  get faceIndices() {
    return this._faceIndices;
  }
  /**
   * Gets the layer indices that correspond to the list of render textures. If we are not in a multi render target, the list will be null
   */
  get layerIndices() {
    return this._layerIndices;
  }
  /**
   * Gets the sample count of the render target
   */
  get samples() {
    return this._samples;
  }
  /**
   * Sets the sample count of the render target
   * @param value sample count
   * @param initializeBuffers If set to true, the engine will make an initializing call to drawBuffers (only used when isMulti=true).
   * @param force true to force calling the update sample count engine function even if the current sample count is equal to value
   * @returns the sample count that has been set
   */
  setSamples(e, t = !0, i = !1) {
    if (this.samples === e && !i)
      return e;
    const r = this._isMulti ? this._engine.updateMultipleRenderTargetTextureSampleCount(this, e, t) : this._engine.updateRenderTargetTextureSampleCount(this, e);
    return this._samples = e, r;
  }
  /**
   * Initializes the render target wrapper
   * @param isMulti true if the wrapper is a multi render target
   * @param isCube true if the wrapper should render to a cube texture
   * @param size size of the render target (width/height/layers)
   * @param engine engine used to create the render target
   */
  constructor(e, t, i, r) {
    this._textures = null, this._faceIndices = null, this._layerIndices = null, this._samples = 1, this._attachments = null, this._generateStencilBuffer = !1, this._generateDepthBuffer = !1, this._depthStencilTextureWithStencil = !1, this._isMulti = e, this._isCube = t, this._size = i, this._engine = r, this._depthStencilTexture = null;
  }
  /**
   * Sets the render target texture(s)
   * @param textures texture(s) to set
   */
  setTextures(e) {
    Array.isArray(e) ? this._textures = e : e ? this._textures = [e] : this._textures = null;
  }
  /**
   * Set a texture in the textures array
   * @param texture The texture to set
   * @param index The index in the textures array to set
   * @param disposePrevious If this function should dispose the previous texture
   */
  setTexture(e, t = 0, i = !0) {
    this._textures || (this._textures = []), this._textures[t] && i && this._textures[t].dispose(), this._textures[t] = e;
  }
  /**
   * Sets the layer and face indices of every render target texture bound to each color attachment
   * @param layers The layers of each texture to be set
   * @param faces The faces of each texture to be set
   */
  setLayerAndFaceIndices(e, t) {
    this._layerIndices = e, this._faceIndices = t;
  }
  /**
   * Sets the layer and face indices of a texture in the textures array that should be bound to each color attachment
   * @param index The index of the texture in the textures array to modify
   * @param layer The layer of the texture to be set
   * @param face The face of the texture to be set
   */
  setLayerAndFaceIndex(e = 0, t, i) {
    this._layerIndices || (this._layerIndices = []), this._faceIndices || (this._faceIndices = []), t !== void 0 && t >= 0 && (this._layerIndices[e] = t), i !== void 0 && i >= 0 && (this._faceIndices[e] = i);
  }
  /**
   * Creates the depth/stencil texture
   * @param comparisonFunction Comparison function to use for the texture
   * @param bilinearFiltering true if bilinear filtering should be used when sampling the texture
   * @param generateStencil true if the stencil aspect should also be created
   * @param samples sample count to use when creating the texture
   * @param format format of the depth texture
   * @param label defines the label to use for the texture (for debugging purpose only)
   * @returns the depth/stencil created texture
   */
  createDepthStencilTexture(e = 0, t = !0, i = !1, r = 1, s = 14, n) {
    var o;
    return (o = this._depthStencilTexture) === null || o === void 0 || o.dispose(), this._depthStencilTextureWithStencil = i, this._depthStencilTexture = this._engine.createDepthStencilTexture(this._size, {
      bilinearFiltering: t,
      comparisonFunction: e,
      generateStencil: i,
      isCube: this._isCube,
      samples: r,
      depthTextureFormat: s,
      label: n
    }, this), this._depthStencilTexture;
  }
  /**
   * Shares the depth buffer of this render target with another render target.
   * @internal
   * @param renderTarget Destination renderTarget
   */
  _shareDepth(e) {
    this._depthStencilTexture && (e._depthStencilTexture && e._depthStencilTexture.dispose(), e._depthStencilTexture = this._depthStencilTexture, this._depthStencilTexture.incrementReferences());
  }
  /**
   * @internal
   */
  _swapAndDie(e) {
    this.texture && this.texture._swapAndDie(e), this._textures = null, this.dispose(!0);
  }
  _cloneRenderTargetWrapper() {
    var e, t, i, r, s, n, o, a;
    let f = null;
    if (this._isMulti) {
      const c = this.textures;
      if (c && c.length > 0) {
        let d = !1, E = c.length;
        const u = c[c.length - 1]._source;
        (u === Te.Depth || u === Te.DepthStencil) && (d = !0, E--);
        const _ = [], p = [], A = [], R = [], N = [], O = [], L = [], U = {};
        for (let w = 0; w < E; ++w) {
          const X = c[w];
          _.push(X.samplingMode), p.push(X.type), A.push(X.format), U[X.uniqueId] !== void 0 ? (R.push(-1), L.push(0)) : (U[X.uniqueId] = w, X.is2DArray ? (R.push(35866), L.push(X.depth)) : X.isCube ? (R.push(34067), L.push(0)) : X.is3D ? (R.push(32879), L.push(X.depth)) : (R.push(3553), L.push(0))), this._faceIndices && N.push((e = this._faceIndices[w]) !== null && e !== void 0 ? e : 0), this._layerIndices && O.push((t = this._layerIndices[w]) !== null && t !== void 0 ? t : 0);
        }
        const y = {
          samplingModes: _,
          generateMipMaps: c[0].generateMipMaps,
          generateDepthBuffer: this._generateDepthBuffer,
          generateStencilBuffer: this._generateStencilBuffer,
          generateDepthTexture: d,
          types: p,
          formats: A,
          textureCount: E,
          targetTypes: R,
          faceIndex: N,
          layerIndex: O,
          layerCounts: L
        }, D = {
          width: this.width,
          height: this.height
        };
        f = this._engine.createMultipleRenderTarget(D, y);
        for (let w = 0; w < E; ++w) {
          if (R[w] !== -1)
            continue;
          const X = U[c[w].uniqueId];
          f.setTexture(f.textures[X], w);
        }
      }
    } else {
      const c = {};
      if (c.generateDepthBuffer = this._generateDepthBuffer, c.generateMipMaps = (r = (i = this.texture) === null || i === void 0 ? void 0 : i.generateMipMaps) !== null && r !== void 0 ? r : !1, c.generateStencilBuffer = this._generateStencilBuffer, c.samplingMode = (s = this.texture) === null || s === void 0 ? void 0 : s.samplingMode, c.type = (n = this.texture) === null || n === void 0 ? void 0 : n.type, c.format = (o = this.texture) === null || o === void 0 ? void 0 : o.format, this.isCube)
        f = this._engine.createRenderTargetCubeTexture(this.width, c);
      else {
        const d = {
          width: this.width,
          height: this.height,
          layers: this.is2DArray ? (a = this.texture) === null || a === void 0 ? void 0 : a.depth : void 0
        };
        f = this._engine.createRenderTargetTexture(d, c);
      }
      f.texture.isReady = !0;
    }
    return f;
  }
  _swapRenderTargetWrapper(e) {
    if (this._textures && e._textures)
      for (let t = 0; t < this._textures.length; ++t)
        this._textures[t]._swapAndDie(e._textures[t], !1), e._textures[t].isReady = !0;
    this._depthStencilTexture && e._depthStencilTexture && (this._depthStencilTexture._swapAndDie(e._depthStencilTexture), e._depthStencilTexture.isReady = !0), this._textures = null, this._depthStencilTexture = null;
  }
  /** @internal */
  _rebuild() {
    const e = this._cloneRenderTargetWrapper();
    if (e) {
      if (this._depthStencilTexture) {
        const t = this._depthStencilTexture.samplingMode, i = t === 2 || t === 3 || t === 11;
        e.createDepthStencilTexture(this._depthStencilTexture._comparisonFunction, i, this._depthStencilTextureWithStencil, this._depthStencilTexture.samples);
      }
      this.samples > 1 && e.setSamples(this.samples), e._swapRenderTargetWrapper(this), e.dispose();
    }
  }
  /**
   * Releases the internal render textures
   */
  releaseTextures() {
    var e, t;
    if (this._textures)
      for (let i = 0; (t = i < ((e = this._textures) === null || e === void 0 ? void 0 : e.length)) !== null && t !== void 0 && t; ++i)
        this._textures[i].dispose();
    this._textures = null;
  }
  /**
   * Disposes the whole render target wrapper
   * @param disposeOnlyFramebuffers true if only the frame buffers should be released (used for the WebGL engine). If false, all the textures will also be released
   */
  dispose(e = !1) {
    var t;
    e || ((t = this._depthStencilTexture) === null || t === void 0 || t.dispose(), this._depthStencilTexture = null, this.releaseTextures()), this._engine._releaseRenderTargetWrapper(this);
  }
}
class mr extends _r {
  constructor(e, t, i, r, s) {
    super(e, t, i, r), this._framebuffer = null, this._depthStencilBuffer = null, this._MSAAFramebuffer = null, this._colorTextureArray = null, this._depthStencilTextureArray = null, this._context = s;
  }
  _cloneRenderTargetWrapper() {
    let e = null;
    return this._colorTextureArray && this._depthStencilTextureArray ? (e = this._engine.createMultiviewRenderTargetTexture(this.width, this.height), e.texture.isReady = !0) : e = super._cloneRenderTargetWrapper(), e;
  }
  _swapRenderTargetWrapper(e) {
    super._swapRenderTargetWrapper(e), e._framebuffer = this._framebuffer, e._depthStencilBuffer = this._depthStencilBuffer, e._MSAAFramebuffer = this._MSAAFramebuffer, e._colorTextureArray = this._colorTextureArray, e._depthStencilTextureArray = this._depthStencilTextureArray, this._framebuffer = this._depthStencilBuffer = this._MSAAFramebuffer = this._colorTextureArray = this._depthStencilTextureArray = null;
  }
  /**
   * Shares the depth buffer of this render target with another render target.
   * @internal
   * @param renderTarget Destination renderTarget
   */
  _shareDepth(e) {
    super._shareDepth(e);
    const t = this._context, i = this._depthStencilBuffer, r = e._MSAAFramebuffer || e._framebuffer;
    e._depthStencilBuffer && t.deleteRenderbuffer(e._depthStencilBuffer), e._depthStencilBuffer = this._depthStencilBuffer, this._engine._bindUnboundFramebuffer(r), t.framebufferRenderbuffer(t.FRAMEBUFFER, t.DEPTH_ATTACHMENT, t.RENDERBUFFER, i), this._engine._bindUnboundFramebuffer(null);
  }
  /**
   * Binds a texture to this render target on a specific attachment
   * @param texture The texture to bind to the framebuffer
   * @param attachmentIndex Index of the attachment
   * @param faceIndexOrLayer The face or layer of the texture to render to in case of cube texture or array texture
   * @param lodLevel defines the lod level to bind to the frame buffer
   */
  _bindTextureRenderTarget(e, t = 0, i, r = 0) {
    var s, n, o, a;
    if (!e._hardwareTexture)
      return;
    const f = this._framebuffer, c = this._engine._currentFramebuffer;
    if (this._engine._bindUnboundFramebuffer(f), this._engine.webGLVersion > 1) {
      const d = this._context, E = d["COLOR_ATTACHMENT" + t];
      e.is2DArray || e.is3D ? (i = (n = i ?? ((s = this.layerIndices) === null || s === void 0 ? void 0 : s[t])) !== null && n !== void 0 ? n : 0, d.framebufferTextureLayer(d.FRAMEBUFFER, E, e._hardwareTexture.underlyingResource, r, i)) : e.isCube ? (i = (a = i ?? ((o = this.faceIndices) === null || o === void 0 ? void 0 : o[t])) !== null && a !== void 0 ? a : 0, d.framebufferTexture2D(d.FRAMEBUFFER, E, d.TEXTURE_CUBE_MAP_POSITIVE_X + i, e._hardwareTexture.underlyingResource, r)) : d.framebufferTexture2D(d.FRAMEBUFFER, E, d.TEXTURE_2D, e._hardwareTexture.underlyingResource, r);
    } else {
      const d = this._context, E = d["COLOR_ATTACHMENT" + t + "_WEBGL"], u = i !== void 0 ? d.TEXTURE_CUBE_MAP_POSITIVE_X + i : d.TEXTURE_2D;
      d.framebufferTexture2D(d.FRAMEBUFFER, E, u, e._hardwareTexture.underlyingResource, r);
    }
    this._engine._bindUnboundFramebuffer(c);
  }
  /**
   * Set a texture in the textures array
   * @param texture the texture to set
   * @param index the index in the textures array to set
   * @param disposePrevious If this function should dispose the previous texture
   */
  setTexture(e, t = 0, i = !0) {
    super.setTexture(e, t, i), this._bindTextureRenderTarget(e, t);
  }
  /**
   * Sets the layer and face indices of every render target texture
   * @param layers The layer of the texture to be set (make negative to not modify)
   * @param faces The face of the texture to be set (make negative to not modify)
   */
  setLayerAndFaceIndices(e, t) {
    var i, r;
    if (super.setLayerAndFaceIndices(e, t), !this.textures || !this.layerIndices || !this.faceIndices)
      return;
    const s = (r = (i = this._attachments) === null || i === void 0 ? void 0 : i.length) !== null && r !== void 0 ? r : this.textures.length;
    for (let n = 0; n < s; n++) {
      const o = this.textures[n];
      o && (o.is2DArray || o.is3D ? this._bindTextureRenderTarget(o, n, this.layerIndices[n]) : o.isCube ? this._bindTextureRenderTarget(o, n, this.faceIndices[n]) : this._bindTextureRenderTarget(o, n));
    }
  }
  /**
   * Set the face and layer indices of a texture in the textures array
   * @param index The index of the texture in the textures array to modify
   * @param layer The layer of the texture to be set
   * @param face The face of the texture to be set
   */
  setLayerAndFaceIndex(e = 0, t, i) {
    if (super.setLayerAndFaceIndex(e, t, i), !this.textures || !this.layerIndices || !this.faceIndices)
      return;
    const r = this.textures[e];
    r.is2DArray || r.is3D ? this._bindTextureRenderTarget(this.textures[e], e, this.layerIndices[e]) : r.isCube && this._bindTextureRenderTarget(this.textures[e], e, this.faceIndices[e]);
  }
  dispose(e = !1) {
    const t = this._context;
    e || (this._colorTextureArray && (this._context.deleteTexture(this._colorTextureArray), this._colorTextureArray = null), this._depthStencilTextureArray && (this._context.deleteTexture(this._depthStencilTextureArray), this._depthStencilTextureArray = null)), this._framebuffer && (t.deleteFramebuffer(this._framebuffer), this._framebuffer = null), this._depthStencilBuffer && (t.deleteRenderbuffer(this._depthStencilBuffer), this._depthStencilBuffer = null), this._MSAAFramebuffer && (t.deleteFramebuffer(this._MSAAFramebuffer), this._MSAAFramebuffer = null), super.dispose(e);
  }
}
q.prototype._createHardwareRenderTargetWrapper = function(l, e, t) {
  const i = new mr(l, e, t, this, this._gl);
  return this._renderTargetWrapperCache.push(i), i;
};
q.prototype.createRenderTargetTexture = function(l, e) {
  var t, i;
  const r = this._createHardwareRenderTargetWrapper(!1, !1, l);
  let s = !0, n = !1, o = !1, a, f = 1;
  e !== void 0 && typeof e == "object" && (s = (t = e.generateDepthBuffer) !== null && t !== void 0 ? t : !0, n = !!e.generateStencilBuffer, o = !!e.noColorAttachment, a = e.colorAttachment, f = (i = e.samples) !== null && i !== void 0 ? i : 1);
  const c = a || (o ? null : this._createInternalTexture(l, e, !0, Te.RenderTarget)), d = l.width || l, E = l.height || l, u = this._currentFramebuffer, _ = this._gl, p = _.createFramebuffer();
  return this._bindUnboundFramebuffer(p), r._depthStencilBuffer = this._setupFramebufferDepthAttachments(n, s, d, E), c && !c.is2DArray && _.framebufferTexture2D(_.FRAMEBUFFER, _.COLOR_ATTACHMENT0, _.TEXTURE_2D, c._hardwareTexture.underlyingResource, 0), this._bindUnboundFramebuffer(u), r._framebuffer = p, r._generateDepthBuffer = s, r._generateStencilBuffer = n, r.setTextures(c), this.updateRenderTargetTextureSampleCount(r, f), r;
};
q.prototype.createDepthStencilTexture = function(l, e, t) {
  if (e.isCube) {
    const i = l.width || l;
    return this._createDepthStencilCubeTexture(i, e, t);
  } else
    return this._createDepthStencilTexture(l, e, t);
};
q.prototype._createDepthStencilTexture = function(l, e, t) {
  const i = this._gl, r = l.layers || 0, s = r !== 0 ? i.TEXTURE_2D_ARRAY : i.TEXTURE_2D, n = new Je(this, Te.DepthStencil);
  if (!this._caps.depthTextureExtension)
    return pe.Error("Depth texture is not supported by your browser or hardware."), n;
  const o = {
    bilinearFiltering: !1,
    comparisonFunction: 0,
    generateStencil: !1,
    ...e
  };
  if (this._bindTextureDirectly(s, n, !0), this._setupDepthStencilTexture(n, l, o.generateStencil, o.comparisonFunction === 0 ? !1 : o.bilinearFiltering, o.comparisonFunction, o.samples), o.depthTextureFormat !== void 0) {
    if (o.depthTextureFormat !== 15 && o.depthTextureFormat !== 16 && o.depthTextureFormat !== 17 && o.depthTextureFormat !== 13 && o.depthTextureFormat !== 14 && o.depthTextureFormat !== 18)
      return pe.Error("Depth texture format is not supported."), n;
    n.format = o.depthTextureFormat;
  } else
    n.format = o.generateStencil ? 13 : 16;
  const a = n.format === 17 || n.format === 13 || n.format === 18;
  t._depthStencilTexture = n, t._depthStencilTextureWithStencil = a;
  let f = i.UNSIGNED_INT;
  n.format === 15 ? f = i.UNSIGNED_SHORT : n.format === 17 || n.format === 13 ? f = i.UNSIGNED_INT_24_8 : n.format === 14 ? f = i.FLOAT : n.format === 18 && (f = i.FLOAT_32_UNSIGNED_INT_24_8_REV);
  const c = a ? i.DEPTH_STENCIL : i.DEPTH_COMPONENT;
  let d = c;
  this.webGLVersion > 1 && (n.format === 15 ? d = i.DEPTH_COMPONENT16 : n.format === 16 ? d = i.DEPTH_COMPONENT24 : n.format === 17 || n.format === 13 ? d = i.DEPTH24_STENCIL8 : n.format === 14 ? d = i.DEPTH_COMPONENT32F : n.format === 18 && (d = i.DEPTH32F_STENCIL8)), n.is2DArray ? i.texImage3D(s, 0, d, n.width, n.height, r, 0, c, f, null) : i.texImage2D(s, 0, d, n.width, n.height, 0, c, f, null), this._bindTextureDirectly(s, null), this._internalTexturesCache.push(n);
  const E = t;
  if (E._depthStencilBuffer) {
    const u = this._currentFramebuffer;
    this._bindUnboundFramebuffer(E._framebuffer), i.framebufferRenderbuffer(i.FRAMEBUFFER, i.DEPTH_STENCIL_ATTACHMENT, i.RENDERBUFFER, null), i.framebufferRenderbuffer(i.FRAMEBUFFER, i.DEPTH_ATTACHMENT, i.RENDERBUFFER, null), i.framebufferRenderbuffer(i.FRAMEBUFFER, i.STENCIL_ATTACHMENT, i.RENDERBUFFER, null), this._bindUnboundFramebuffer(u), i.deleteRenderbuffer(E._depthStencilBuffer), E._depthStencilBuffer = null;
  }
  return n;
};
q.prototype.updateRenderTargetTextureSampleCount = function(l, e) {
  if (this.webGLVersion < 2 || !l || !l.texture)
    return 1;
  if (l.samples === e)
    return e;
  const t = this._gl;
  e = Math.min(e, this.getCaps().maxMSAASamples), l._depthStencilBuffer && (t.deleteRenderbuffer(l._depthStencilBuffer), l._depthStencilBuffer = null), l._MSAAFramebuffer && (t.deleteFramebuffer(l._MSAAFramebuffer), l._MSAAFramebuffer = null);
  const i = l.texture._hardwareTexture;
  if (i.releaseMSAARenderBuffers(), e > 1 && typeof t.renderbufferStorageMultisample == "function") {
    const r = t.createFramebuffer();
    if (!r)
      throw new Error("Unable to create multi sampled framebuffer");
    l._MSAAFramebuffer = r, this._bindUnboundFramebuffer(l._MSAAFramebuffer);
    const s = this._createRenderBuffer(l.texture.width, l.texture.height, e, -1, this._getRGBAMultiSampleBufferFormat(l.texture.type), t.COLOR_ATTACHMENT0, !1);
    if (!s)
      throw new Error("Unable to create multi sampled framebuffer");
    i.addMSAARenderBuffer(s);
  } else
    this._bindUnboundFramebuffer(l._framebuffer);
  return l.texture.samples = e, l._samples = e, l._depthStencilBuffer = this._setupFramebufferDepthAttachments(l._generateStencilBuffer, l._generateDepthBuffer, l.texture.width, l.texture.height, e), this._bindUnboundFramebuffer(null), e;
};
q.prototype.createRenderTargetCubeTexture = function(l, e) {
  const t = this._createHardwareRenderTargetWrapper(!1, !0, l), i = {
    generateMipMaps: !0,
    generateDepthBuffer: !0,
    generateStencilBuffer: !1,
    type: 0,
    samplingMode: 3,
    format: 5,
    ...e
  };
  i.generateStencilBuffer = i.generateDepthBuffer && i.generateStencilBuffer, (i.type === 1 && !this._caps.textureFloatLinearFiltering || i.type === 2 && !this._caps.textureHalfFloatLinearFiltering) && (i.samplingMode = 1);
  const r = this._gl, s = new Je(this, Te.RenderTarget);
  this._bindTextureDirectly(r.TEXTURE_CUBE_MAP, s, !0);
  const n = this._getSamplingParameters(i.samplingMode, i.generateMipMaps);
  i.type === 1 && !this._caps.textureFloat && (i.type = 0, pe.Warn("Float textures are not supported. Cube render target forced to TEXTURETYPE_UNESIGNED_BYTE type")), r.texParameteri(r.TEXTURE_CUBE_MAP, r.TEXTURE_MAG_FILTER, n.mag), r.texParameteri(r.TEXTURE_CUBE_MAP, r.TEXTURE_MIN_FILTER, n.min), r.texParameteri(r.TEXTURE_CUBE_MAP, r.TEXTURE_WRAP_S, r.CLAMP_TO_EDGE), r.texParameteri(r.TEXTURE_CUBE_MAP, r.TEXTURE_WRAP_T, r.CLAMP_TO_EDGE);
  for (let a = 0; a < 6; a++)
    r.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X + a, 0, this._getRGBABufferInternalSizedFormat(i.type, i.format), l, l, 0, this._getInternalFormat(i.format), this._getWebGLTextureType(i.type), null);
  const o = r.createFramebuffer();
  return this._bindUnboundFramebuffer(o), t._depthStencilBuffer = this._setupFramebufferDepthAttachments(i.generateStencilBuffer, i.generateDepthBuffer, l, l), i.generateMipMaps && r.generateMipmap(r.TEXTURE_CUBE_MAP), this._bindTextureDirectly(r.TEXTURE_CUBE_MAP, null), this._bindUnboundFramebuffer(null), t._framebuffer = o, t._generateDepthBuffer = i.generateDepthBuffer, t._generateStencilBuffer = i.generateStencilBuffer, s.width = l, s.height = l, s.isReady = !0, s.isCube = !0, s.samples = 1, s.generateMipMaps = i.generateMipMaps, s.samplingMode = i.samplingMode, s.type = i.type, s.format = i.format, this._internalTexturesCache.push(s), t.setTextures(s), t;
};
const pr = "postprocessVertexShader", Tr = `attribute vec2 position;
uniform vec2 scale;
varying vec2 vUV;
const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vUV=(position*madd+madd)*scale;
gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;
C.ShadersStore[pr] = Tr;
const ei = {
  positions: [1, 1, -1, 1, -1, -1, 1, -1],
  indices: [0, 1, 2, 0, 2, 3]
};
class yi {
  /**
   * Creates an effect renderer
   * @param engine the engine to use for rendering
   * @param options defines the options of the effect renderer
   */
  constructor(e, t = ei) {
    var i, r;
    this._fullscreenViewport = new $i(0, 0, 1, 1);
    const s = (i = t.positions) !== null && i !== void 0 ? i : ei.positions, n = (r = t.indices) !== null && r !== void 0 ? r : ei.indices;
    this.engine = e, this._vertexBuffers = {
      [k.PositionKind]: new k(e, s, k.PositionKind, !1, !1, 2)
    }, this._indexBuffer = e.createIndexBuffer(n), this._onContextRestoredObserver = e.onContextRestoredObservable.add(() => {
      this._indexBuffer = e.createIndexBuffer(n);
      for (const o in this._vertexBuffers)
        this._vertexBuffers[o]._rebuild();
    });
  }
  /**
   * Sets the current viewport in normalized coordinates 0-1
   * @param viewport Defines the viewport to set (defaults to 0 0 1 1)
   */
  setViewport(e = this._fullscreenViewport) {
    this.engine.setViewport(e);
  }
  /**
   * Binds the embedded attributes buffer to the effect.
   * @param effect Defines the effect to bind the attributes for
   */
  bindBuffers(e) {
    this.engine.bindBuffers(this._vertexBuffers, this._indexBuffer, e);
  }
  /**
   * Sets the current effect wrapper to use during draw.
   * The effect needs to be ready before calling this api.
   * This also sets the default full screen position attribute.
   * @param effectWrapper Defines the effect to draw with
   */
  applyEffectWrapper(e) {
    this.engine.setState(!0), this.engine.depthCullingState.depthTest = !1, this.engine.stencilState.stencilTest = !1, this.engine.enableEffect(e._drawWrapper), this.bindBuffers(e.effect), e.onApplyObservable.notifyObservers({});
  }
  /**
   * Restores engine states
   */
  restoreStates() {
    this.engine.depthCullingState.depthTest = !0, this.engine.stencilState.stencilTest = !0;
  }
  /**
   * Draws a full screen quad.
   */
  draw() {
    this.engine.drawElementsType(0, 0, 6);
  }
  _isRenderTargetTexture(e) {
    return e.renderTarget !== void 0;
  }
  /**
   * renders one or more effects to a specified texture
   * @param effectWrapper the effect to renderer
   * @param outputTexture texture to draw to, if null it will render to the screen.
   */
  render(e, t = null) {
    if (!e.effect.isReady())
      return;
    this.setViewport();
    const i = t === null ? null : this._isRenderTargetTexture(t) ? t.renderTarget : t;
    i && this.engine.bindFramebuffer(i), this.applyEffectWrapper(e), this.draw(), i && this.engine.unBindFramebuffer(i), this.restoreStates();
  }
  /**
   * Disposes of the effect renderer
   */
  dispose() {
    const e = this._vertexBuffers[k.PositionKind];
    e && (e.dispose(), delete this._vertexBuffers[k.PositionKind]), this._indexBuffer && this.engine._releaseBuffer(this._indexBuffer), this._onContextRestoredObserver && (this.engine.onContextRestoredObservable.remove(this._onContextRestoredObserver), this._onContextRestoredObserver = null);
  }
}
class Ui {
  /**
   * The underlying effect
   */
  get effect() {
    return this._drawWrapper.effect;
  }
  set effect(e) {
    this._drawWrapper.effect = e;
  }
  /**
   * Creates an effect to be renderer
   * @param creationOptions options to create the effect
   */
  constructor(e) {
    this.onApplyObservable = new $();
    let t;
    const i = e.uniformNames || [];
    e.vertexShader ? t = {
      fragmentSource: e.fragmentShader,
      vertexSource: e.vertexShader,
      spectorName: e.name || "effectWrapper"
    } : (i.push("scale"), t = {
      fragmentSource: e.fragmentShader,
      vertex: "postprocess",
      spectorName: e.name || "effectWrapper"
    }, this.onApplyObservable.add(() => {
      this.effect.setFloat2("scale", 1, 1);
    }));
    const r = e.defines ? e.defines.join(`
`) : "";
    this._drawWrapper = new li(e.engine), e.useShaderStore ? (t.fragment = t.fragmentSource, t.vertex || (t.vertex = t.vertexSource), delete t.fragmentSource, delete t.vertexSource, this.effect = e.engine.createEffect(t, e.attributeNames || ["position"], i, e.samplerNames, r, void 0, e.onCompiled, void 0, void 0, e.shaderLanguage)) : (this.effect = new ne(t, e.attributeNames || ["position"], i, e.samplerNames, e.engine, r, void 0, e.onCompiled, void 0, void 0, void 0, e.shaderLanguage), this._onContextRestoredObserver = e.engine.onContextRestoredObservable.add(() => {
      this.effect._pipelineContext = null, this.effect._wasPreviouslyReady = !1, this.effect._prepareEffect();
    }));
  }
  /**
   * Disposes of the effect wrapper
   */
  dispose() {
    this._onContextRestoredObserver && (this.effect.getEngine().onContextRestoredObservable.remove(this._onContextRestoredObserver), this._onContextRestoredObserver = null), this.effect.dispose();
  }
}
const wi = "passPixelShader", Bi = `varying vec2 vUV;
uniform sampler2D textureSampler;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{
gl_FragColor=texture2D(textureSampler,vUV);
}`;
C.ShadersStore[wi] = Bi;
const Ai = { name: wi, shader: Bi };
class de {
  static _CreateDumpRenderer() {
    if (!de._DumpToolsEngine) {
      const e = document.createElement("canvas"), t = new q(e, !1, {
        preserveDrawingBuffer: !0,
        depth: !1,
        stencil: !1,
        alpha: !0,
        premultipliedAlpha: !1,
        antialias: !1,
        failIfMajorPerformanceCaveat: !1
      });
      t.getCaps().parallelShaderCompile = void 0;
      const i = new yi(t), r = new Ui({
        engine: t,
        name: Ai.name,
        fragmentShader: Ai.shader,
        samplerNames: ["textureSampler"]
      });
      de._DumpToolsEngine = {
        canvas: e,
        engine: t,
        renderer: i,
        wrapper: r
      };
    }
    return de._DumpToolsEngine;
  }
  /**
   * Dumps the current bound framebuffer
   * @param width defines the rendering width
   * @param height defines the rendering height
   * @param engine defines the hosting engine
   * @param successCallback defines the callback triggered once the data are available
   * @param mimeType defines the mime type of the result
   * @param fileName defines the filename to download. If present, the result will automatically be downloaded
   * @returns a void promise
   */
  static async DumpFramebuffer(e, t, i, r, s = "image/png", n) {
    const o = await i.readPixels(0, 0, e, t), a = new Uint8Array(o.buffer);
    de.DumpData(e, t, a, r, s, n, !0);
  }
  /**
   * Dumps an array buffer
   * @param width defines the rendering width
   * @param height defines the rendering height
   * @param data the data array
   * @param mimeType defines the mime type of the result
   * @param fileName defines the filename to download. If present, the result will automatically be downloaded
   * @param invertY true to invert the picture in the Y dimension
   * @param toArrayBuffer true to convert the data to an ArrayBuffer (encoded as `mimeType`) instead of a base64 string
   * @param quality defines the quality of the result
   * @returns a promise that resolve to the final data
   */
  static DumpDataAsync(e, t, i, r = "image/png", s, n = !1, o = !1, a) {
    return new Promise((f) => {
      de.DumpData(e, t, i, (c) => f(c), r, s, n, o, a);
    });
  }
  /**
   * Dumps an array buffer
   * @param width defines the rendering width
   * @param height defines the rendering height
   * @param data the data array
   * @param successCallback defines the callback triggered once the data are available
   * @param mimeType defines the mime type of the result
   * @param fileName defines the filename to download. If present, the result will automatically be downloaded
   * @param invertY true to invert the picture in the Y dimension
   * @param toArrayBuffer true to convert the data to an ArrayBuffer (encoded as `mimeType`) instead of a base64 string
   * @param quality defines the quality of the result
   */
  static DumpData(e, t, i, r, s = "image/png", n, o = !1, a = !1, f) {
    const c = de._CreateDumpRenderer();
    if (c.engine.setSize(e, t, !0), i instanceof Float32Array) {
      const E = new Uint8Array(i.length);
      let u = i.length;
      for (; u--; ) {
        const _ = i[u];
        E[u] = _ < 0 ? 0 : _ > 1 ? 1 : Math.round(_ * 255);
      }
      i = E;
    }
    const d = c.engine.createRawTexture(i, e, t, 5, !1, !o, 1);
    c.renderer.setViewport(), c.renderer.applyEffectWrapper(c.wrapper), c.wrapper.effect._bindTexture("textureSampler", d), c.renderer.draw(), a ? Me.ToBlob(c.canvas, (E) => {
      const u = new FileReader();
      u.onload = (_) => {
        const p = _.target.result;
        r && r(p);
      }, u.readAsArrayBuffer(E);
    }, s, f) : Me.EncodeScreenshotCanvasData(c.canvas, r, s, n, f), d.dispose();
  }
  /**
   * Dispose the dump tools associated resources
   */
  static Dispose() {
    de._DumpToolsEngine && (de._DumpToolsEngine.wrapper.dispose(), de._DumpToolsEngine.renderer.dispose(), de._DumpToolsEngine.engine.dispose()), de._DumpToolsEngine = null;
  }
}
const Ar = () => {
  Me.DumpData = de.DumpData, Me.DumpDataAsync = de.DumpDataAsync, Me.DumpFramebuffer = de.DumpFramebuffer;
};
Ar();
class ve extends I {
  /**
   * Use this list to define the list of mesh you want to render.
   */
  get renderList() {
    return this._renderList;
  }
  set renderList(e) {
    this._unObserveRenderList && (this._unObserveRenderList(), this._unObserveRenderList = null), e && (this._unObserveRenderList = er(e, this._renderListHasChanged)), this._renderList = e;
  }
  /**
   * Post-processes for this render target
   */
  get postProcesses() {
    return this._postProcesses;
  }
  get _prePassEnabled() {
    return !!this._prePassRenderTarget && this._prePassRenderTarget.enabled;
  }
  /**
   * Set a after unbind callback in the texture.
   * This has been kept for backward compatibility and use of onAfterUnbindObservable is recommended.
   */
  set onAfterUnbind(e) {
    this._onAfterUnbindObserver && this.onAfterUnbindObservable.remove(this._onAfterUnbindObserver), this._onAfterUnbindObserver = this.onAfterUnbindObservable.add(e);
  }
  /**
   * Set a before render callback in the texture.
   * This has been kept for backward compatibility and use of onBeforeRenderObservable is recommended.
   */
  set onBeforeRender(e) {
    this._onBeforeRenderObserver && this.onBeforeRenderObservable.remove(this._onBeforeRenderObserver), this._onBeforeRenderObserver = this.onBeforeRenderObservable.add(e);
  }
  /**
   * Set a after render callback in the texture.
   * This has been kept for backward compatibility and use of onAfterRenderObservable is recommended.
   */
  set onAfterRender(e) {
    this._onAfterRenderObserver && this.onAfterRenderObservable.remove(this._onAfterRenderObserver), this._onAfterRenderObserver = this.onAfterRenderObservable.add(e);
  }
  /**
   * Set a clear callback in the texture.
   * This has been kept for backward compatibility and use of onClearObservable is recommended.
   */
  set onClear(e) {
    this._onClearObserver && this.onClearObservable.remove(this._onClearObserver), this._onClearObserver = this.onClearObservable.add(e);
  }
  /**
   * Gets the render pass ids used by the render target texture. For a single render target the array length will be 1, for a cube texture it will be 6 and for
   * a 2D texture array it will return an array of ids the size of the 2D texture array
   */
  get renderPassIds() {
    return this._renderPassIds;
  }
  /**
   * Gets the current value of the refreshId counter
   */
  get currentRefreshId() {
    return this._currentRefreshId;
  }
  /**
   * Sets a specific material to be used to render a mesh/a list of meshes in this render target texture
   * @param mesh mesh or array of meshes
   * @param material material or array of materials to use for this render pass. If undefined is passed, no specific material will be used but the regular material instead (mesh.material). It's possible to provide an array of materials to use a different material for each rendering in the case of a cube texture (6 rendering) and a 2D texture array (as many rendering as the length of the array)
   */
  setMaterialForRendering(e, t) {
    let i;
    Array.isArray(e) ? i = e : i = [e];
    for (let r = 0; r < i.length; ++r)
      for (let s = 0; s < this._renderPassIds.length; ++s)
        i[r].setMaterialForRenderPass(this._renderPassIds[s], t !== void 0 ? Array.isArray(t) ? t[s] : t : void 0);
  }
  /**
   * Define if the texture has multiple draw buffers or if false a single draw buffer.
   */
  get isMulti() {
    var e, t;
    return (t = (e = this._renderTarget) === null || e === void 0 ? void 0 : e.isMulti) !== null && t !== void 0 ? t : !1;
  }
  /**
   * Gets render target creation options that were used.
   */
  get renderTargetOptions() {
    return this._renderTargetOptions;
  }
  /**
   * Gets the render target wrapper associated with this render target
   */
  get renderTarget() {
    return this._renderTarget;
  }
  _onRatioRescale() {
    this._sizeRatio && this.resize(this._initialSizeParameter);
  }
  /**
   * Gets or sets the size of the bounding box associated with the texture (when in cube mode)
   * When defined, the cubemap will switch to local mode
   * @see https://community.arm.com/graphics/b/blog/posts/reflections-based-on-local-cubemaps-in-unity
   * @example https://www.babylonjs-playground.com/#RNASML
   */
  set boundingBoxSize(e) {
    if (this._boundingBoxSize && this._boundingBoxSize.equals(e))
      return;
    this._boundingBoxSize = e;
    const t = this.getScene();
    t && t.markAllMaterialsAsDirty(1);
  }
  get boundingBoxSize() {
    return this._boundingBoxSize;
  }
  /**
   * In case the RTT has been created with a depth texture, get the associated
   * depth texture.
   * Otherwise, return null.
   */
  get depthStencilTexture() {
    var e, t;
    return (t = (e = this._renderTarget) === null || e === void 0 ? void 0 : e._depthStencilTexture) !== null && t !== void 0 ? t : null;
  }
  /** @internal */
  constructor(e, t, i, r = !1, s = !0, n = 0, o = !1, a = I.TRILINEAR_SAMPLINGMODE, f = !0, c = !1, d = !1, E = 5, u = !1, _, p, A = !1, R = !1) {
    var N, O, L, U, y, D;
    let w;
    if (typeof r == "object") {
      const H = r;
      r = !!H.generateMipMaps, s = (N = H.doNotChangeAspectRatio) !== null && N !== void 0 ? N : !0, n = (O = H.type) !== null && O !== void 0 ? O : 0, o = !!H.isCube, a = (L = H.samplingMode) !== null && L !== void 0 ? L : I.TRILINEAR_SAMPLINGMODE, f = (U = H.generateDepthBuffer) !== null && U !== void 0 ? U : !0, c = !!H.generateStencilBuffer, d = !!H.isMulti, E = (y = H.format) !== null && y !== void 0 ? y : 5, u = !!H.delayAllocation, _ = H.samples, p = H.creationFlags, A = !!H.noColorAttachment, R = !!H.useSRGBBuffer, w = H.colorAttachment;
    }
    if (super(null, i, !r, void 0, a, void 0, void 0, void 0, void 0, E), this._unObserveRenderList = null, this._renderListHasChanged = (H, Ae) => {
      var ee;
      const ge = this._renderList ? this._renderList.length : 0;
      (Ae === 0 && ge > 0 || ge === 0) && ((ee = this.getScene()) === null || ee === void 0 || ee.meshes.forEach((xe) => {
        xe._markSubMeshesAsLightDirty();
      }));
    }, this.renderParticles = !0, this.renderSprites = !1, this.forceLayerMaskCheck = !1, this.ignoreCameraViewport = !1, this.onBeforeBindObservable = new $(), this.onAfterUnbindObservable = new $(), this.onBeforeRenderObservable = new $(), this.onAfterRenderObservable = new $(), this.onClearObservable = new $(), this.onResizeObservable = new $(), this._cleared = !1, this.skipInitialClear = !1, this._currentRefreshId = -1, this._refreshRate = 1, this._samples = 1, this._canRescale = !0, this._renderTarget = null, this.boundingBoxPosition = g.Zero(), i = this.getScene(), !i)
      return;
    const X = this.getScene().getEngine();
    this._coordinatesMode = I.PROJECTION_MODE, this.renderList = new Array(), this.name = e, this.isRenderTarget = !0, this._initialSizeParameter = t, this._renderPassIds = [], this._isCubeData = o, this._processSizeParameter(t), this.renderPassId = this._renderPassIds[0], this._resizeObserver = X.onResizeObservable.add(() => {
    }), this._generateMipMaps = !!r, this._doNotChangeAspectRatio = s, this._renderingManager = new ai(i), this._renderingManager._useSceneAutoClearSetup = !0, !d && (this._renderTargetOptions = {
      generateMipMaps: r,
      type: n,
      format: (D = this._format) !== null && D !== void 0 ? D : void 0,
      samplingMode: this.samplingMode,
      generateDepthBuffer: f,
      generateStencilBuffer: c,
      samples: _,
      creationFlags: p,
      noColorAttachment: A,
      useSRGBBuffer: R,
      colorAttachment: w,
      label: this.name
    }, this.samplingMode === I.NEAREST_SAMPLINGMODE && (this.wrapU = I.CLAMP_ADDRESSMODE, this.wrapV = I.CLAMP_ADDRESSMODE), u || (o ? (this._renderTarget = i.getEngine().createRenderTargetCubeTexture(this.getRenderSize(), this._renderTargetOptions), this.coordinatesMode = I.INVCUBIC_MODE, this._textureMatrix = B.Identity()) : this._renderTarget = i.getEngine().createRenderTargetTexture(this._size, this._renderTargetOptions), this._texture = this._renderTarget.texture, _ !== void 0 && (this.samples = _)));
  }
  /**
   * Creates a depth stencil texture.
   * This is only available in WebGL 2 or with the depth texture extension available.
   * @param comparisonFunction Specifies the comparison function to set on the texture. If 0 or undefined, the texture is not in comparison mode (default: 0)
   * @param bilinearFiltering Specifies whether or not bilinear filtering is enable on the texture (default: true)
   * @param generateStencil Specifies whether or not a stencil should be allocated in the texture (default: false)
   * @param samples sample count of the depth/stencil texture (default: 1)
   * @param format format of the depth texture (default: 14)
   */
  createDepthStencilTexture(e = 0, t = !0, i = !1, r = 1, s = 14) {
    var n;
    (n = this._renderTarget) === null || n === void 0 || n.createDepthStencilTexture(e, t, i, r, s);
  }
  _releaseRenderPassId() {
    if (this._scene) {
      const e = this._scene.getEngine();
      for (let t = 0; t < this._renderPassIds.length; ++t)
        e.releaseRenderPassId(this._renderPassIds[t]);
    }
    this._renderPassIds = [];
  }
  _createRenderPassId() {
    this._releaseRenderPassId();
    const e = this._scene.getEngine(), t = this._isCubeData ? 6 : this.getRenderLayers() || 1;
    for (let i = 0; i < t; ++i)
      this._renderPassIds[i] = e.createRenderPassId(`RenderTargetTexture - ${this.name}#${i}`);
  }
  _processSizeParameter(e) {
    if (e.ratio) {
      this._sizeRatio = e.ratio;
      const t = this._getEngine();
      this._size = {
        width: this._bestReflectionRenderTargetDimension(t.getRenderWidth(), this._sizeRatio),
        height: this._bestReflectionRenderTargetDimension(t.getRenderHeight(), this._sizeRatio)
      };
    } else
      this._size = e;
    this._createRenderPassId();
  }
  /**
   * Define the number of samples to use in case of MSAA.
   * It defaults to one meaning no MSAA has been enabled.
   */
  get samples() {
    var e, t;
    return (t = (e = this._renderTarget) === null || e === void 0 ? void 0 : e.samples) !== null && t !== void 0 ? t : this._samples;
  }
  set samples(e) {
    this._renderTarget && (this._samples = this._renderTarget.setSamples(e));
  }
  /**
   * Resets the refresh counter of the texture and start bak from scratch.
   * Could be useful to regenerate the texture if it is setup to render only once.
   */
  resetRefreshCounter() {
    this._currentRefreshId = -1;
  }
  /**
   * Define the refresh rate of the texture or the rendering frequency.
   * Use 0 to render just once, 1 to render on every frame, 2 to render every two frames and so on...
   */
  get refreshRate() {
    return this._refreshRate;
  }
  set refreshRate(e) {
    this._refreshRate = e, this.resetRefreshCounter();
  }
  /**
   * Adds a post process to the render target rendering passes.
   * @param postProcess define the post process to add
   */
  addPostProcess(e) {
    if (!this._postProcessManager) {
      const t = this.getScene();
      if (!t)
        return;
      this._postProcessManager = new Li(t), this._postProcesses = new Array();
    }
    this._postProcesses.push(e), this._postProcesses[0].autoClear = !1;
  }
  /**
   * Clear all the post processes attached to the render target
   * @param dispose define if the cleared post processes should also be disposed (false by default)
   */
  clearPostProcesses(e = !1) {
    if (this._postProcesses) {
      if (e)
        for (const t of this._postProcesses)
          t.dispose();
      this._postProcesses = [];
    }
  }
  /**
   * Remove one of the post process from the list of attached post processes to the texture
   * @param postProcess define the post process to remove from the list
   */
  removePostProcess(e) {
    if (!this._postProcesses)
      return;
    const t = this._postProcesses.indexOf(e);
    t !== -1 && (this._postProcesses.splice(t, 1), this._postProcesses.length > 0 && (this._postProcesses[0].autoClear = !1));
  }
  /** @internal */
  _shouldRender() {
    return this._currentRefreshId === -1 ? (this._currentRefreshId = 1, !0) : this.refreshRate === this._currentRefreshId ? (this._currentRefreshId = 1, !0) : (this._currentRefreshId++, !1);
  }
  /**
   * Gets the actual render size of the texture.
   * @returns the width of the render size
   */
  getRenderSize() {
    return this.getRenderWidth();
  }
  /**
   * Gets the actual render width of the texture.
   * @returns the width of the render size
   */
  getRenderWidth() {
    return this._size.width ? this._size.width : this._size;
  }
  /**
   * Gets the actual render height of the texture.
   * @returns the height of the render size
   */
  getRenderHeight() {
    return this._size.width ? this._size.height : this._size;
  }
  /**
   * Gets the actual number of layers of the texture.
   * @returns the number of layers
   */
  getRenderLayers() {
    const e = this._size.layers;
    return e || 0;
  }
  /**
   * Don't allow this render target texture to rescale. Mainly used to prevent rescaling by the scene optimizer.
   */
  disableRescaling() {
    this._canRescale = !1;
  }
  /**
   * Get if the texture can be rescaled or not.
   */
  get canRescale() {
    return this._canRescale;
  }
  /**
   * Resize the texture using a ratio.
   * @param ratio the ratio to apply to the texture size in order to compute the new target size
   */
  scale(e) {
    const t = Math.max(1, this.getRenderSize() * e);
    this.resize(t);
  }
  /**
   * Get the texture reflection matrix used to rotate/transform the reflection.
   * @returns the reflection matrix
   */
  getReflectionTextureMatrix() {
    return this.isCube ? this._textureMatrix : super.getReflectionTextureMatrix();
  }
  /**
   * Resize the texture to a new desired size.
   * Be careful as it will recreate all the data in the new texture.
   * @param size Define the new size. It can be:
   *   - a number for squared texture,
   *   - an object containing { width: number, height: number }
   *   - or an object containing a ratio { ratio: number }
   */
  resize(e) {
    var t;
    const i = this.isCube;
    (t = this._renderTarget) === null || t === void 0 || t.dispose(), this._renderTarget = null;
    const r = this.getScene();
    r && (this._processSizeParameter(e), i ? this._renderTarget = r.getEngine().createRenderTargetCubeTexture(this.getRenderSize(), this._renderTargetOptions) : this._renderTarget = r.getEngine().createRenderTargetTexture(this._size, this._renderTargetOptions), this._texture = this._renderTarget.texture, this._renderTargetOptions.samples !== void 0 && (this.samples = this._renderTargetOptions.samples), this.onResizeObservable.hasObservers() && this.onResizeObservable.notifyObservers(this));
  }
  /**
   * Renders all the objects from the render list into the texture.
   * @param useCameraPostProcess Define if camera post processes should be used during the rendering
   * @param dumpForDebug Define if the rendering result should be dumped (copied) for debugging purpose
   */
  render(e = !1, t = !1) {
    this._render(e, t);
  }
  /**
   * This function will check if the render target texture can be rendered (textures are loaded, shaders are compiled)
   * @returns true if all required resources are ready
   */
  isReadyForRendering() {
    return this._render(!1, !1, !0);
  }
  _render(e = !1, t = !1, i = !1) {
    var r;
    const s = this.getScene();
    if (!s)
      return i;
    const n = s.getEngine();
    if (this.useCameraPostProcesses !== void 0 && (e = this.useCameraPostProcesses), this._waitingRenderList) {
      this.renderList = [];
      for (let d = 0; d < this._waitingRenderList.length; d++) {
        const E = this._waitingRenderList[d], u = s.getMeshById(E);
        u && this.renderList.push(u);
      }
      this._waitingRenderList = void 0;
    }
    if (this.renderListPredicate) {
      this.renderList ? this.renderList.length = 0 : this.renderList = [];
      const d = this.getScene();
      if (!d)
        return i;
      const E = d.meshes;
      for (let u = 0; u < E.length; u++) {
        const _ = E[u];
        this.renderListPredicate(_) && this.renderList.push(_);
      }
    }
    const o = n.currentRenderPassId;
    this.onBeforeBindObservable.notifyObservers(this);
    const a = (r = this.activeCamera) !== null && r !== void 0 ? r : s.activeCamera, f = s.activeCamera;
    a && (a !== s.activeCamera && (s.setTransformMatrix(a.getViewMatrix(), a.getProjectionMatrix(!0)), s.activeCamera = a), n.setViewport(a.viewport, this.getRenderWidth(), this.getRenderHeight())), this._defaultRenderListPrepared = !1;
    let c = i;
    if (i) {
      s.getViewMatrix() || s.updateTransformMatrix();
      const d = this.is2DArray ? this.getRenderLayers() : this.isCube ? 6 : 1;
      for (let E = 0; E < d && c; E++) {
        let u = null;
        const _ = this.renderList ? this.renderList : s.getActiveMeshes().data, p = this.renderList ? this.renderList.length : s.getActiveMeshes().length;
        n.currentRenderPassId = this._renderPassIds[E], this.onBeforeRenderObservable.notifyObservers(E), this.getCustomRenderList && (u = this.getCustomRenderList(E, _, p)), u || (u = _), this._doNotChangeAspectRatio || s.updateTransformMatrix(!0);
        for (let A = 0; A < u.length && c; ++A) {
          const R = u[A];
          if (!(!R.isEnabled() || R.isBlocked || !R.isVisible || !R.subMeshes)) {
            if (this.customIsReadyFunction) {
              if (!this.customIsReadyFunction(R, this.refreshRate, i)) {
                c = !1;
                continue;
              }
            } else if (!R.isReady(!0)) {
              c = !1;
              continue;
            }
          }
        }
        this.onAfterRenderObservable.notifyObservers(E), (this.is2DArray || this.isCube) && (s.incrementRenderId(), s.resetCachedMaterial());
      }
    } else if (this.is2DArray && !this.isMulti)
      for (let d = 0; d < this.getRenderLayers(); d++)
        this._renderToTarget(0, e, t, d, a), s.incrementRenderId(), s.resetCachedMaterial();
    else if (this.isCube && !this.isMulti)
      for (let d = 0; d < 6; d++)
        this._renderToTarget(d, e, t, void 0, a), s.incrementRenderId(), s.resetCachedMaterial();
    else
      this._renderToTarget(0, e, t, void 0, a);
    return this.onAfterUnbindObservable.notifyObservers(this), n.currentRenderPassId = o, f && (s.activeCamera = f, (s.getEngine().scenes.length > 1 || this.activeCamera && this.activeCamera !== s.activeCamera) && s.setTransformMatrix(s.activeCamera.getViewMatrix(), s.activeCamera.getProjectionMatrix(!0)), n.setViewport(s.activeCamera.viewport)), s.resetCachedMaterial(), c;
  }
  _bestReflectionRenderTargetDimension(e, t) {
    const r = e * t, s = Z.NearestPOT(r + 128 * 128 / (128 + r));
    return Math.min(Z.FloorPOT(e), s);
  }
  _prepareRenderingManager(e, t, i, r) {
    const s = this.getScene();
    if (!s)
      return;
    this._renderingManager.reset();
    const n = s.getRenderId();
    for (let o = 0; o < t; o++) {
      const a = e[o];
      if (a && !a.isBlocked) {
        if (this.customIsReadyFunction) {
          if (!this.customIsReadyFunction(a, this.refreshRate, !1)) {
            this.resetRefreshCounter();
            continue;
          }
        } else if (!a.isReady(this.refreshRate === 0)) {
          this.resetRefreshCounter();
          continue;
        }
        if (!a._internalAbstractMeshDataInfo._currentLODIsUpToDate && s.activeCamera && (a._internalAbstractMeshDataInfo._currentLOD = s.customLODSelector ? s.customLODSelector(a, this.activeCamera || s.activeCamera) : a.getLOD(this.activeCamera || s.activeCamera), a._internalAbstractMeshDataInfo._currentLODIsUpToDate = !0), !a._internalAbstractMeshDataInfo._currentLOD)
          continue;
        let f = a._internalAbstractMeshDataInfo._currentLOD;
        f._preActivateForIntermediateRendering(n);
        let c;
        if (r && i ? c = (a.layerMask & i.layerMask) === 0 : c = !1, a.isEnabled() && a.isVisible && a.subMeshes && !c && (f !== a && f._activate(n, !0), a._activate(n, !0) && a.subMeshes.length)) {
          a.isAnInstance ? a._internalAbstractMeshDataInfo._actAsRegularMesh && (f = a) : f._internalAbstractMeshDataInfo._onlyForInstancesIntermediate = !1, f._internalAbstractMeshDataInfo._isActiveIntermediate = !0;
          for (let d = 0; d < f.subMeshes.length; d++) {
            const E = f.subMeshes[d];
            this._renderingManager.dispatch(E, f);
          }
        }
      }
    }
    for (let o = 0; o < s.particleSystems.length; o++) {
      const a = s.particleSystems[o], f = a.emitter;
      !a.isStarted() || !f || f.position && !f.isEnabled() || this._renderingManager.dispatchParticles(a);
    }
  }
  /**
   * @internal
   * @param faceIndex face index to bind to if this is a cubetexture
   * @param layer defines the index of the texture to bind in the array
   */
  _bindFrameBuffer(e = 0, t = 0) {
    const i = this.getScene();
    if (!i)
      return;
    const r = i.getEngine();
    this._renderTarget && r.bindFramebuffer(this._renderTarget, this.isCube ? e : void 0, void 0, void 0, this.ignoreCameraViewport, 0, t);
  }
  _unbindFrameBuffer(e, t) {
    this._renderTarget && e.unBindFramebuffer(this._renderTarget, this.isCube, () => {
      this.onAfterRenderObservable.notifyObservers(t);
    });
  }
  /**
   * @internal
   */
  _prepareFrame(e, t, i, r) {
    this._postProcessManager ? this._prePassEnabled || this._postProcessManager._prepareFrame(this._texture, this._postProcesses) : (!r || !e.postProcessManager._prepareFrame(this._texture)) && this._bindFrameBuffer(t, i);
  }
  _renderToTarget(e, t, i, r = 0, s = null) {
    var n, o, a, f, c, d;
    const E = this.getScene();
    if (!E)
      return;
    const u = E.getEngine();
    if ((n = u._debugPushGroup) === null || n === void 0 || n.call(u, `render to face #${e} layer #${r}`, 1), this._prepareFrame(E, e, r, t), this.is2DArray ? (u.currentRenderPassId = this._renderPassIds[r], this.onBeforeRenderObservable.notifyObservers(r)) : (u.currentRenderPassId = this._renderPassIds[e], this.onBeforeRenderObservable.notifyObservers(e)), u.snapshotRendering && u.snapshotRenderingMode === 1)
      this.onClearObservable.hasObservers() ? this.onClearObservable.notifyObservers(u) : this.skipInitialClear || u.clear(this.clearColor || E.clearColor, !0, !0, !0);
    else {
      let p = null;
      const A = this.renderList ? this.renderList : E.getActiveMeshes().data, R = this.renderList ? this.renderList.length : E.getActiveMeshes().length;
      this.getCustomRenderList && (p = this.getCustomRenderList(this.is2DArray ? r : e, A, R)), p ? this._prepareRenderingManager(p, p.length, s, this.forceLayerMaskCheck) : (this._defaultRenderListPrepared || (this._prepareRenderingManager(A, R, s, !this.renderList || this.forceLayerMaskCheck), this._defaultRenderListPrepared = !0), p = A);
      for (const O of E._beforeRenderTargetClearStage)
        O.action(this, e, r);
      this.onClearObservable.hasObservers() ? this.onClearObservable.notifyObservers(u) : this.skipInitialClear || u.clear(this.clearColor || E.clearColor, !0, !0, !0), this._doNotChangeAspectRatio || E.updateTransformMatrix(!0);
      for (const O of E._beforeRenderTargetDrawStage)
        O.action(this, e, r);
      this._renderingManager.render(this.customRenderFunction, p, this.renderParticles, this.renderSprites);
      for (const O of E._afterRenderTargetDrawStage)
        O.action(this, e, r);
      const N = (a = (o = this._texture) === null || o === void 0 ? void 0 : o.generateMipMaps) !== null && a !== void 0 ? a : !1;
      this._texture && (this._texture.generateMipMaps = !1), this._postProcessManager ? this._postProcessManager._finalizeFrame(!1, (f = this._renderTarget) !== null && f !== void 0 ? f : void 0, e, this._postProcesses, this.ignoreCameraViewport) : t && E.postProcessManager._finalizeFrame(!1, (c = this._renderTarget) !== null && c !== void 0 ? c : void 0, e);
      for (const O of E._afterRenderTargetPostProcessStage)
        O.action(this, e, r);
      this._texture && (this._texture.generateMipMaps = N), this._doNotChangeAspectRatio || E.updateTransformMatrix(!0), i && de.DumpFramebuffer(this.getRenderWidth(), this.getRenderHeight(), u);
    }
    this._unbindFrameBuffer(u, e), this._texture && this.isCube && e === 5 && u.generateMipMapsForCubemap(this._texture), (d = u._debugPopGroup) === null || d === void 0 || d.call(u, 1);
  }
  /**
   * Overrides the default sort function applied in the rendering group to prepare the meshes.
   * This allowed control for front to back rendering or reversely depending of the special needs.
   *
   * @param renderingGroupId The rendering group id corresponding to its index
   * @param opaqueSortCompareFn The opaque queue comparison function use to sort.
   * @param alphaTestSortCompareFn The alpha test queue comparison function use to sort.
   * @param transparentSortCompareFn The transparent queue comparison function use to sort.
   */
  setRenderingOrder(e, t = null, i = null, r = null) {
    this._renderingManager.setRenderingOrder(e, t, i, r);
  }
  /**
   * Specifies whether or not the stencil and depth buffer are cleared between two rendering groups.
   *
   * @param renderingGroupId The rendering group id corresponding to its index
   * @param autoClearDepthStencil Automatically clears depth and stencil between groups if true.
   */
  setRenderingAutoClearDepthStencil(e, t) {
    this._renderingManager.setRenderingAutoClearDepthStencil(e, t), this._renderingManager._useSceneAutoClearSetup = !1;
  }
  /**
   * Clones the texture.
   * @returns the cloned texture
   */
  clone() {
    const e = this.getSize(), t = new ve(this.name, e, this.getScene(), this._renderTargetOptions.generateMipMaps, this._doNotChangeAspectRatio, this._renderTargetOptions.type, this.isCube, this._renderTargetOptions.samplingMode, this._renderTargetOptions.generateDepthBuffer, this._renderTargetOptions.generateStencilBuffer, void 0, this._renderTargetOptions.format, void 0, this._renderTargetOptions.samples);
    return t.hasAlpha = this.hasAlpha, t.level = this.level, t.coordinatesMode = this.coordinatesMode, this.renderList && (t.renderList = this.renderList.slice(0)), t;
  }
  /**
   * Serialize the texture to a JSON representation we can easily use in the respective Parse function.
   * @returns The JSON representation of the texture
   */
  serialize() {
    if (!this.name)
      return null;
    const e = super.serialize();
    if (e.renderTargetSize = this.getRenderSize(), e.renderList = [], this.renderList)
      for (let t = 0; t < this.renderList.length; t++)
        e.renderList.push(this.renderList[t].id);
    return e;
  }
  /**
   *  This will remove the attached framebuffer objects. The texture will not be able to be used as render target anymore
   */
  disposeFramebufferObjects() {
    var e;
    (e = this._renderTarget) === null || e === void 0 || e.dispose(!0);
  }
  /**
   * Release and destroy the underlying lower level texture aka internalTexture.
   */
  releaseInternalTexture() {
    var e;
    (e = this._renderTarget) === null || e === void 0 || e.releaseTextures(), this._texture = null;
  }
  /**
   * Dispose the texture and release its associated resources.
   */
  dispose() {
    var e;
    this.onResizeObservable.clear(), this.onClearObservable.clear(), this.onAfterRenderObservable.clear(), this.onAfterUnbindObservable.clear(), this.onBeforeBindObservable.clear(), this.onBeforeRenderObservable.clear(), this._postProcessManager && (this._postProcessManager.dispose(), this._postProcessManager = null), this._prePassRenderTarget && this._prePassRenderTarget.dispose(), this._releaseRenderPassId(), this.clearPostProcesses(!0), this._resizeObserver && (this.getScene().getEngine().onResizeObservable.remove(this._resizeObserver), this._resizeObserver = null), this.renderList = null;
    const t = this.getScene();
    if (!t)
      return;
    let i = t.customRenderTargets.indexOf(this);
    i >= 0 && t.customRenderTargets.splice(i, 1);
    for (const r of t.cameras)
      i = r.customRenderTargets.indexOf(this), i >= 0 && r.customRenderTargets.splice(i, 1);
    (e = this._renderTarget) === null || e === void 0 || e.dispose(), this._renderTarget = null, this._texture = null, super.dispose();
  }
  /** @internal */
  _rebuild() {
    this.refreshRate === ve.REFRESHRATE_RENDER_ONCE && (this.refreshRate = ve.REFRESHRATE_RENDER_ONCE), this._postProcessManager && this._postProcessManager._rebuild();
  }
  /**
   * Clear the info related to rendering groups preventing retention point in material dispose.
   */
  freeRenderingGroups() {
    this._renderingManager && this._renderingManager.freeRenderingGroups();
  }
  /**
   * Gets the number of views the corresponding to the texture (eg. a MultiviewRenderTarget will have > 1)
   * @returns the view count
   */
  getViewCount() {
    return 1;
  }
}
ve.REFRESHRATE_RENDER_ONCE = 0;
ve.REFRESHRATE_RENDER_ONEVERYFRAME = 1;
ve.REFRESHRATE_RENDER_ONEVERYTWOFRAMES = 2;
I._CreateRenderTargetTexture = (l, e, t, i, r) => new ve(l, e, t, i);
class W {
  /**
   * Registers a shader code processing with a post process name.
   * @param postProcessName name of the post process. Use null for the fallback shader code processing. This is the shader code processing that will be used in case no specific shader code processing has been associated to a post process name
   * @param customShaderCodeProcessing shader code processing to associate to the post process name
   * @returns
   */
  static RegisterShaderCodeProcessing(e, t) {
    if (!t) {
      delete W._CustomShaderCodeProcessing[e ?? ""];
      return;
    }
    W._CustomShaderCodeProcessing[e ?? ""] = t;
  }
  static _GetShaderCodeProcessing(e) {
    var t;
    return (t = W._CustomShaderCodeProcessing[e]) !== null && t !== void 0 ? t : W._CustomShaderCodeProcessing[""];
  }
  /**
   * Number of sample textures (default: 1)
   */
  get samples() {
    return this._samples;
  }
  set samples(e) {
    this._samples = Math.min(e, this._engine.getCaps().maxMSAASamples), this._textures.forEach((t) => {
      t.setSamples(this._samples);
    });
  }
  /**
   * Returns the fragment url or shader name used in the post process.
   * @returns the fragment url or name in the shader store.
   */
  getEffectName() {
    return this._fragmentUrl;
  }
  /**
   * A function that is added to the onActivateObservable
   */
  set onActivate(e) {
    this._onActivateObserver && this.onActivateObservable.remove(this._onActivateObserver), e && (this._onActivateObserver = this.onActivateObservable.add(e));
  }
  /**
   * A function that is added to the onSizeChangedObservable
   */
  set onSizeChanged(e) {
    this._onSizeChangedObserver && this.onSizeChangedObservable.remove(this._onSizeChangedObserver), this._onSizeChangedObserver = this.onSizeChangedObservable.add(e);
  }
  /**
   * A function that is added to the onApplyObservable
   */
  set onApply(e) {
    this._onApplyObserver && this.onApplyObservable.remove(this._onApplyObserver), this._onApplyObserver = this.onApplyObservable.add(e);
  }
  /**
   * A function that is added to the onBeforeRenderObservable
   */
  set onBeforeRender(e) {
    this._onBeforeRenderObserver && this.onBeforeRenderObservable.remove(this._onBeforeRenderObserver), this._onBeforeRenderObserver = this.onBeforeRenderObservable.add(e);
  }
  /**
   * A function that is added to the onAfterRenderObservable
   */
  set onAfterRender(e) {
    this._onAfterRenderObserver && this.onAfterRenderObservable.remove(this._onAfterRenderObserver), this._onAfterRenderObserver = this.onAfterRenderObservable.add(e);
  }
  /**
   * The input texture for this post process and the output texture of the previous post process. When added to a pipeline the previous post process will
   * render it's output into this texture and this texture will be used as textureSampler in the fragment shader of this post process.
   */
  get inputTexture() {
    return this._textures.data[this._currentRenderTextureInd];
  }
  set inputTexture(e) {
    this._forcedOutputTexture = e;
  }
  /**
   * Since inputTexture should always be defined, if we previously manually set `inputTexture`,
   * the only way to unset it is to use this function to restore its internal state
   */
  restoreDefaultInputTexture() {
    this._forcedOutputTexture && (this._forcedOutputTexture = null, this.markTextureDirty());
  }
  /**
   * Gets the camera which post process is applied to.
   * @returns The camera the post process is applied to.
   */
  getCamera() {
    return this._camera;
  }
  /**
   * Gets the texel size of the postprocess.
   * See https://en.wikipedia.org/wiki/Texel_(graphics)
   */
  get texelSize() {
    return this._shareOutputWithPostProcess ? this._shareOutputWithPostProcess.texelSize : (this._forcedOutputTexture && this._texelSize.copyFromFloats(1 / this._forcedOutputTexture.width, 1 / this._forcedOutputTexture.height), this._texelSize);
  }
  /**
   * Creates a new instance PostProcess
   * @param name The name of the PostProcess.
   * @param fragmentUrl The url of the fragment shader to be used.
   * @param parameters Array of the names of uniform non-sampler2D variables that will be passed to the shader.
   * @param samplers Array of the names of uniform sampler2D variables that will be passed to the shader.
   * @param options The required width/height ratio to downsize to before computing the render pass. (Use 1.0 for full size)
   * @param camera The camera to apply the render pass to.
   * @param samplingMode The sampling mode to be used when computing the pass. (default: 0)
   * @param engine The engine which the post process will be applied. (default: current engine)
   * @param reusable If the post process can be reused on the same frame. (default: false)
   * @param defines String of defines that will be set when running the fragment shader. (default: null)
   * @param textureType Type of textures used when performing the post process. (default: 0)
   * @param vertexUrl The url of the vertex shader to be used. (default: "postprocess")
   * @param indexParameters The index parameters to be used for babylons include syntax "#include<kernelBlurVaryingDeclaration>[0..varyingCount]". (default: undefined) See usage in babylon.blurPostProcess.ts and kernelBlur.vertex.fx
   * @param blockCompilation If the shader should not be compiled immediatly. (default: false)
   * @param textureFormat Format of textures used when performing the post process. (default: TEXTUREFORMAT_RGBA)
   */
  constructor(e, t, i, r, s, n, o = 1, a, f, c = null, d = 0, E = "postprocess", u, _ = !1, p = 5, A = ir.GLSL) {
    this._parentContainer = null, this.width = -1, this.height = -1, this.nodeMaterialSource = null, this._outputTexture = null, this.autoClear = !0, this.forceAutoClearInAlphaMode = !1, this.alphaMode = 0, this.animations = new Array(), this.enablePixelPerfectMode = !1, this.forceFullscreenViewport = !0, this.scaleMode = 1, this.alwaysForcePOT = !1, this._samples = 1, this.adaptScaleToCurrentViewport = !1, this._reusable = !1, this._renderId = 0, this.externalTextureSamplerBinding = !1, this._textures = new yt(2), this._textureCache = [], this._currentRenderTextureInd = 0, this._scaleRatio = new _t(1, 1), this._texelSize = _t.Zero(), this.onActivateObservable = new $(), this.onSizeChangedObservable = new $(), this.onApplyObservable = new $(), this.onBeforeRenderObservable = new $(), this.onAfterRenderObservable = new $(), this.name = e, n != null ? (this._camera = n, this._scene = n.getScene(), n.attachPostProcess(this), this._engine = this._scene.getEngine(), this._scene.postProcesses.push(this), this.uniqueId = this._scene.getUniqueId()) : a && (this._engine = a, this._engine.postProcesses.push(this)), this._options = s, this.renderTargetSamplingMode = o || 1, this._reusable = f || !1, this._textureType = d, this._textureFormat = p, this._shaderLanguage = A, this._samplers = r || [], this._samplers.push("textureSampler"), this._fragmentUrl = t, this._vertexUrl = E, this._parameters = i || [], this._parameters.push("scale"), this._indexParameters = u, this._drawWrapper = new li(this._engine), _ || this.updateEffect(c);
  }
  /**
   * Gets a string identifying the name of the class
   * @returns "PostProcess" string
   */
  getClassName() {
    return "PostProcess";
  }
  /**
   * Gets the engine which this post process belongs to.
   * @returns The engine the post process was enabled with.
   */
  getEngine() {
    return this._engine;
  }
  /**
   * The effect that is created when initializing the post process.
   * @returns The created effect corresponding the the postprocess.
   */
  getEffect() {
    return this._drawWrapper.effect;
  }
  /**
   * To avoid multiple redundant textures for multiple post process, the output the output texture for this post process can be shared with another.
   * @param postProcess The post process to share the output with.
   * @returns This post process.
   */
  shareOutputWith(e) {
    return this._disposeTextures(), this._shareOutputWithPostProcess = e, this;
  }
  /**
   * Reverses the effect of calling shareOutputWith and returns the post process back to its original state.
   * This should be called if the post process that shares output with this post process is disabled/disposed.
   */
  useOwnOutput() {
    this._textures.length == 0 && (this._textures = new yt(2)), this._shareOutputWithPostProcess = null;
  }
  /**
   * Updates the effect with the current post process compile time values and recompiles the shader.
   * @param defines Define statements that should be added at the beginning of the shader. (default: null)
   * @param uniforms Set of uniform variables that will be passed to the shader. (default: null)
   * @param samplers Set of Texture2D variables that will be passed to the shader. (default: null)
   * @param indexParameters The index parameters to be used for babylons include syntax "#include<kernelBlurVaryingDeclaration>[0..varyingCount]". (default: undefined) See usage in babylon.blurPostProcess.ts and kernelBlur.vertex.fx
   * @param onCompiled Called when the shader has been compiled.
   * @param onError Called if there is an error when compiling a shader.
   * @param vertexUrl The url of the vertex shader to be used (default: the one given at construction time)
   * @param fragmentUrl The url of the fragment shader to be used (default: the one given at construction time)
   */
  updateEffect(e = null, t = null, i = null, r, s, n, o, a) {
    var f, c;
    const d = W._GetShaderCodeProcessing(this.name);
    if (d != null && d.defineCustomBindings) {
      const E = (f = t == null ? void 0 : t.slice()) !== null && f !== void 0 ? f : [];
      E.push(...this._parameters);
      const u = (c = i == null ? void 0 : i.slice()) !== null && c !== void 0 ? c : [];
      u.push(...this._samplers), e = d.defineCustomBindings(this.name, e, E, u), t = E, i = u;
    }
    this._postProcessDefines = e, this._drawWrapper.effect = this._engine.createEffect({ vertex: o ?? this._vertexUrl, fragment: a ?? this._fragmentUrl }, {
      attributes: ["position"],
      uniformsNames: t || this._parameters,
      uniformBuffersNames: [],
      samplers: i || this._samplers,
      defines: e !== null ? e : "",
      fallbacks: null,
      onCompiled: s ?? null,
      onError: n ?? null,
      indexParameters: r || this._indexParameters,
      processCodeAfterIncludes: d != null && d.processCodeAfterIncludes ? (E, u) => d.processCodeAfterIncludes(this.name, E, u) : null,
      processFinalCode: d != null && d.processFinalCode ? (E, u) => d.processFinalCode(this.name, E, u) : null,
      shaderLanguage: this._shaderLanguage
    }, this._engine);
  }
  /**
   * The post process is reusable if it can be used multiple times within one frame.
   * @returns If the post process is reusable
   */
  isReusable() {
    return this._reusable;
  }
  /** invalidate frameBuffer to hint the postprocess to create a depth buffer */
  markTextureDirty() {
    this.width = -1;
  }
  _createRenderTargetTexture(e, t, i = 0) {
    for (let s = 0; s < this._textureCache.length; s++)
      if (this._textureCache[s].texture.width === e.width && this._textureCache[s].texture.height === e.height && this._textureCache[s].postProcessChannel === i && this._textureCache[s].texture._generateDepthBuffer === t.generateDepthBuffer && this._textureCache[s].texture.samples === t.samples)
        return this._textureCache[s].texture;
    const r = this._engine.createRenderTargetTexture(e, t);
    return this._textureCache.push({ texture: r, postProcessChannel: i, lastUsedRenderId: -1 }), r;
  }
  _flushTextureCache() {
    const e = this._renderId;
    for (let t = this._textureCache.length - 1; t >= 0; t--)
      if (e - this._textureCache[t].lastUsedRenderId > 100) {
        let i = !1;
        for (let r = 0; r < this._textures.length; r++)
          if (this._textures.data[r] === this._textureCache[t].texture) {
            i = !0;
            break;
          }
        i || (this._textureCache[t].texture.dispose(), this._textureCache.splice(t, 1));
      }
  }
  _resize(e, t, i, r, s) {
    this._textures.length > 0 && this._textures.reset(), this.width = e, this.height = t;
    let n = null;
    for (let f = 0; f < i._postProcesses.length; f++)
      if (i._postProcesses[f] !== null) {
        n = i._postProcesses[f];
        break;
      }
    const o = { width: this.width, height: this.height }, a = {
      generateMipMaps: r,
      generateDepthBuffer: s || n === this,
      generateStencilBuffer: (s || n === this) && this._engine.isStencilEnable,
      samplingMode: this.renderTargetSamplingMode,
      type: this._textureType,
      format: this._textureFormat,
      samples: this._samples,
      label: "PostProcessRTT-" + this.name
    };
    this._textures.push(this._createRenderTargetTexture(o, a, 0)), this._reusable && this._textures.push(this._createRenderTargetTexture(o, a, 1)), this._texelSize.copyFromFloats(1 / this.width, 1 / this.height), this.onSizeChangedObservable.notifyObservers(this);
  }
  /**
   * Activates the post process by intializing the textures to be used when executed. Notifies onActivateObservable.
   * When this post process is used in a pipeline, this is call will bind the input texture of this post process to the output of the previous.
   * @param camera The camera that will be used in the post process. This camera will be used when calling onActivateObservable.
   * @param sourceTexture The source texture to be inspected to get the width and height if not specified in the post process constructor. (default: null)
   * @param forceDepthStencil If true, a depth and stencil buffer will be generated. (default: false)
   * @returns The render target wrapper that was bound to be written to.
   */
  activate(e, t = null, i) {
    var r, s;
    e = e || this._camera;
    const n = e.getScene(), o = n.getEngine(), a = o.getCaps().maxTextureSize;
    let f = (t ? t.width : this._engine.getRenderWidth(!0)) * this._options | 0;
    const c = (t ? t.height : this._engine.getRenderHeight(!0)) * this._options | 0, d = e.parent;
    d && (d.leftCamera == e || d.rightCamera == e) && (f /= 2);
    let E = this._options.width || f, u = this._options.height || c;
    const _ = this.renderTargetSamplingMode !== 7 && this.renderTargetSamplingMode !== 1 && this.renderTargetSamplingMode !== 2;
    if (!this._shareOutputWithPostProcess && !this._forcedOutputTexture) {
      if (this.adaptScaleToCurrentViewport) {
        const A = o.currentViewport;
        A && (E *= A.width, u *= A.height);
      }
      (_ || this.alwaysForcePOT) && (this._options.width || (E = o.needPOTTextures ? Z.GetExponentOfTwo(E, a, this.scaleMode) : E), this._options.height || (u = o.needPOTTextures ? Z.GetExponentOfTwo(u, a, this.scaleMode) : u)), (this.width !== E || this.height !== u) && this._resize(E, u, e, _, i), this._textures.forEach((A) => {
        A.samples !== this.samples && this._engine.updateRenderTargetTextureSampleCount(A, this.samples);
      }), this._flushTextureCache(), this._renderId++;
    }
    let p;
    if (this._shareOutputWithPostProcess)
      p = this._shareOutputWithPostProcess.inputTexture;
    else if (this._forcedOutputTexture)
      p = this._forcedOutputTexture, this.width = this._forcedOutputTexture.width, this.height = this._forcedOutputTexture.height;
    else {
      p = this.inputTexture;
      let A;
      for (let R = 0; R < this._textureCache.length; R++)
        if (this._textureCache[R].texture === p) {
          A = this._textureCache[R];
          break;
        }
      A && (A.lastUsedRenderId = this._renderId);
    }
    return this.enablePixelPerfectMode ? (this._scaleRatio.copyFromFloats(f / E, c / u), this._engine.bindFramebuffer(p, 0, f, c, this.forceFullscreenViewport)) : (this._scaleRatio.copyFromFloats(1, 1), this._engine.bindFramebuffer(p, 0, void 0, void 0, this.forceFullscreenViewport)), (s = (r = this._engine)._debugInsertMarker) === null || s === void 0 || s.call(r, `post process ${this.name} input`), this.onActivateObservable.notifyObservers(e), this.autoClear && (this.alphaMode === 0 || this.forceAutoClearInAlphaMode) && this._engine.clear(this.clearColor ? this.clearColor : n.clearColor, n._allowPostProcessClearColor, !0, !0), this._reusable && (this._currentRenderTextureInd = (this._currentRenderTextureInd + 1) % 2), p;
  }
  /**
   * If the post process is supported.
   */
  get isSupported() {
    return this._drawWrapper.effect.isSupported;
  }
  /**
   * The aspect ratio of the output texture.
   */
  get aspectRatio() {
    return this._shareOutputWithPostProcess ? this._shareOutputWithPostProcess.aspectRatio : this._forcedOutputTexture ? this._forcedOutputTexture.width / this._forcedOutputTexture.height : this.width / this.height;
  }
  /**
   * Get a value indicating if the post-process is ready to be used
   * @returns true if the post-process is ready (shader is compiled)
   */
  isReady() {
    var e, t;
    return (t = (e = this._drawWrapper.effect) === null || e === void 0 ? void 0 : e.isReady()) !== null && t !== void 0 ? t : !1;
  }
  /**
   * Binds all textures and uniforms to the shader, this will be run on every pass.
   * @returns the effect corresponding to this post process. Null if not compiled or not ready.
   */
  apply() {
    var e, t, i;
    if (!(!((e = this._drawWrapper.effect) === null || e === void 0) && e.isReady()))
      return null;
    this._engine.enableEffect(this._drawWrapper), this._engine.setState(!1), this._engine.setDepthBuffer(!1), this._engine.setDepthWrite(!1), this._engine.setAlphaMode(this.alphaMode), this.alphaConstants && this.getEngine().setAlphaConstants(this.alphaConstants.r, this.alphaConstants.g, this.alphaConstants.b, this.alphaConstants.a);
    let r;
    return this._shareOutputWithPostProcess ? r = this._shareOutputWithPostProcess.inputTexture : this._forcedOutputTexture ? r = this._forcedOutputTexture : r = this.inputTexture, this.externalTextureSamplerBinding || this._drawWrapper.effect._bindTexture("textureSampler", r == null ? void 0 : r.texture), this._drawWrapper.effect.setVector2("scale", this._scaleRatio), this.onApplyObservable.notifyObservers(this._drawWrapper.effect), (i = (t = W._GetShaderCodeProcessing(this.name)) === null || t === void 0 ? void 0 : t.bindCustomBindings) === null || i === void 0 || i.call(t, this.name, this._drawWrapper.effect), this._drawWrapper.effect;
  }
  _disposeTextures() {
    if (this._shareOutputWithPostProcess || this._forcedOutputTexture) {
      this._disposeTextureCache();
      return;
    }
    this._disposeTextureCache(), this._textures.dispose();
  }
  _disposeTextureCache() {
    for (let e = this._textureCache.length - 1; e >= 0; e--)
      this._textureCache[e].texture.dispose();
    this._textureCache.length = 0;
  }
  /**
   * Sets the required values to the prepass renderer.
   * @param prePassRenderer defines the prepass renderer to setup.
   * @returns true if the pre pass is needed.
   */
  setPrePassRenderer(e) {
    return this._prePassEffectConfiguration ? (this._prePassEffectConfiguration = e.addEffectConfiguration(this._prePassEffectConfiguration), this._prePassEffectConfiguration.enabled = !0, !0) : !1;
  }
  /**
   * Disposes the post process.
   * @param camera The camera to dispose the post process on.
   */
  dispose(e) {
    e = e || this._camera, this._disposeTextures();
    let t;
    if (this._scene && (t = this._scene.postProcesses.indexOf(this), t !== -1 && this._scene.postProcesses.splice(t, 1)), this._parentContainer) {
      const i = this._parentContainer.postProcesses.indexOf(this);
      i > -1 && this._parentContainer.postProcesses.splice(i, 1), this._parentContainer = null;
    }
    if (t = this._engine.postProcesses.indexOf(this), t !== -1 && this._engine.postProcesses.splice(t, 1), !!e) {
      if (e.detachPostProcess(this), t = e._postProcesses.indexOf(this), t === 0 && e._postProcesses.length > 0) {
        const i = this._camera._getFirstPostProcess();
        i && i.markTextureDirty();
      }
      this.onActivateObservable.clear(), this.onAfterRenderObservable.clear(), this.onApplyObservable.clear(), this.onBeforeRenderObservable.clear(), this.onSizeChangedObservable.clear();
    }
  }
  /**
   * Serializes the post process to a JSON object
   * @returns the JSON object
   */
  serialize() {
    const e = j.Serialize(this), t = this.getCamera() || this._scene && this._scene.activeCamera;
    return e.customType = "BABYLON." + this.getClassName(), e.cameraId = t ? t.id : null, e.reusable = this._reusable, e.textureType = this._textureType, e.fragmentUrl = this._fragmentUrl, e.parameters = this._parameters, e.samplers = this._samplers, e.options = this._options, e.defines = this._postProcessDefines, e.textureFormat = this._textureFormat, e.vertexUrl = this._vertexUrl, e.indexParameters = this._indexParameters, e;
  }
  /**
   * Clones this post process
   * @returns a new post process similar to this one
   */
  clone() {
    const e = this.serialize();
    e._engine = this._engine, e.cameraId = null;
    const t = W.Parse(e, this._scene, "");
    return t ? (t.onActivateObservable = this.onActivateObservable.clone(), t.onSizeChangedObservable = this.onSizeChangedObservable.clone(), t.onApplyObservable = this.onApplyObservable.clone(), t.onBeforeRenderObservable = this.onBeforeRenderObservable.clone(), t.onAfterRenderObservable = this.onAfterRenderObservable.clone(), t._prePassEffectConfiguration = this._prePassEffectConfiguration, t) : null;
  }
  /**
   * Creates a material from parsed material data
   * @param parsedPostProcess defines parsed post process data
   * @param scene defines the hosting scene
   * @param rootUrl defines the root URL to use to load textures
   * @returns a new post process
   */
  static Parse(e, t, i) {
    const r = Gt(e.customType);
    if (!r || !r._Parse)
      return null;
    const s = t ? t.getCameraById(e.cameraId) : null;
    return r._Parse(e, s, t, i);
  }
  /**
   * @internal
   */
  static _Parse(e, t, i, r) {
    return j.Parse(() => new W(e.name, e.fragmentUrl, e.parameters, e.samplers, e.options, t, e.renderTargetSamplingMode, e._engine, e.reusable, e.defines, e.textureType, e.vertexUrl, e.indexParameters, !1, e.textureFormat), e, i, r);
  }
}
W._CustomShaderCodeProcessing = {};
h([
  T()
], W.prototype, "uniqueId", void 0);
h([
  T()
], W.prototype, "name", void 0);
h([
  T()
], W.prototype, "width", void 0);
h([
  T()
], W.prototype, "height", void 0);
h([
  T()
], W.prototype, "renderTargetSamplingMode", void 0);
h([
  tr()
], W.prototype, "clearColor", void 0);
h([
  T()
], W.prototype, "autoClear", void 0);
h([
  T()
], W.prototype, "forceAutoClearInAlphaMode", void 0);
h([
  T()
], W.prototype, "alphaMode", void 0);
h([
  T()
], W.prototype, "alphaConstants", void 0);
h([
  T()
], W.prototype, "enablePixelPerfectMode", void 0);
h([
  T()
], W.prototype, "forceFullscreenViewport", void 0);
h([
  T()
], W.prototype, "scaleMode", void 0);
h([
  T()
], W.prototype, "alwaysForcePOT", void 0);
h([
  T("samples")
], W.prototype, "_samples", void 0);
h([
  T()
], W.prototype, "adaptScaleToCurrentViewport", void 0);
Fe("BABYLON.PostProcess", W);
const gr = "kernelBlurVaryingDeclaration", Sr = "varying vec2 sampleCoord{X};";
C.IncludesShadersStore[gr] = Sr;
const Rr = "packingFunctions", Cr = `vec4 pack(float depth)
{
const vec4 bit_shift=vec4(255.0*255.0*255.0,255.0*255.0,255.0,1.0);
const vec4 bit_mask=vec4(0.0,1.0/255.0,1.0/255.0,1.0/255.0);
vec4 res=fract(depth*bit_shift);
res-=res.xxyz*bit_mask;
return res;
}
float unpack(vec4 color)
{
const vec4 bit_shift=vec4(1.0/(255.0*255.0*255.0),1.0/(255.0*255.0),1.0/255.0,1.0);
return dot(color,bit_shift);
}`;
C.IncludesShadersStore[Rr] = Cr;
const vr = "kernelBlurFragment", Ir = `#ifdef DOF
factor=sampleCoC(sampleCoord{X}); 
computedWeight=KERNEL_WEIGHT{X}*factor;
sumOfWeights+=computedWeight;
#else
computedWeight=KERNEL_WEIGHT{X};
#endif
#ifdef PACKEDFLOAT
blend+=unpack(texture2D(textureSampler,sampleCoord{X}))*computedWeight;
#else
blend+=texture2D(textureSampler,sampleCoord{X})*computedWeight;
#endif
`;
C.IncludesShadersStore[vr] = Ir;
const Mr = "kernelBlurFragment2", xr = `#ifdef DOF
factor=sampleCoC(sampleCenter+delta*KERNEL_DEP_OFFSET{X});
computedWeight=KERNEL_DEP_WEIGHT{X}*factor;
sumOfWeights+=computedWeight;
#else
computedWeight=KERNEL_DEP_WEIGHT{X};
#endif
#ifdef PACKEDFLOAT
blend+=unpack(texture2D(textureSampler,sampleCenter+delta*KERNEL_DEP_OFFSET{X}))*computedWeight;
#else
blend+=texture2D(textureSampler,sampleCenter+delta*KERNEL_DEP_OFFSET{X})*computedWeight;
#endif
`;
C.IncludesShadersStore[Mr] = xr;
const Nr = "kernelBlurPixelShader", Or = `uniform sampler2D textureSampler;
uniform vec2 delta;
varying vec2 sampleCenter;
#ifdef DOF
uniform sampler2D circleOfConfusionSampler;
float sampleCoC(in vec2 offset) {
float coc=texture2D(circleOfConfusionSampler,offset).r;
return coc; 
}
#endif
#include<kernelBlurVaryingDeclaration>[0..varyingCount]
#ifdef PACKEDFLOAT
#include<packingFunctions>
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{
float computedWeight=0.0;
#ifdef PACKEDFLOAT
float blend=0.;
#else
vec4 blend=vec4(0.);
#endif
#ifdef DOF
float sumOfWeights=CENTER_WEIGHT; 
float factor=0.0;
#ifdef PACKEDFLOAT
blend+=unpack(texture2D(textureSampler,sampleCenter))*CENTER_WEIGHT;
#else
blend+=texture2D(textureSampler,sampleCenter)*CENTER_WEIGHT;
#endif
#endif
#include<kernelBlurFragment>[0..varyingCount]
#include<kernelBlurFragment2>[0..depCount]
#ifdef PACKEDFLOAT
gl_FragColor=pack(blend);
#else
gl_FragColor=blend;
#endif
#ifdef DOF
gl_FragColor/=sumOfWeights;
#endif
}`;
C.ShadersStore[Nr] = Or;
const Lr = "kernelBlurVertex", Dr = "sampleCoord{X}=sampleCenter+delta*KERNEL_OFFSET{X};";
C.IncludesShadersStore[Lr] = Dr;
const Pr = "kernelBlurVertexShader", br = `attribute vec2 position;
uniform vec2 delta;
varying vec2 sampleCenter;
#include<kernelBlurVaryingDeclaration>[0..varyingCount]
const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
sampleCenter=(position*madd+madd);
#include<kernelBlurVertex>[0..varyingCount]
gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;
C.ShadersStore[Pr] = br;
class je extends W {
  /**
   * Sets the length in pixels of the blur sample region
   */
  set kernel(e) {
    this._idealKernel !== e && (e = Math.max(e, 1), this._idealKernel = e, this._kernel = this._nearestBestKernel(e), this._blockCompilation || this._updateParameters());
  }
  /**
   * Gets the length in pixels of the blur sample region
   */
  get kernel() {
    return this._idealKernel;
  }
  /**
   * Sets whether or not the blur needs to unpack/repack floats
   */
  set packedFloat(e) {
    this._packedFloat !== e && (this._packedFloat = e, this._blockCompilation || this._updateParameters());
  }
  /**
   * Gets whether or not the blur is unpacking/repacking floats
   */
  get packedFloat() {
    return this._packedFloat;
  }
  /**
   * Gets a string identifying the name of the class
   * @returns "BlurPostProcess" string
   */
  getClassName() {
    return "BlurPostProcess";
  }
  /**
   * Creates a new instance BlurPostProcess
   * @param name The name of the effect.
   * @param direction The direction in which to blur the image.
   * @param kernel The size of the kernel to be used when computing the blur. eg. Size of 3 will blur the center pixel by 2 pixels surrounding it.
   * @param options The required width/height ratio to downsize to before computing the render pass. (Use 1.0 for full size)
   * @param camera The camera to apply the render pass to.
   * @param samplingMode The sampling mode to be used when computing the pass. (default: 0)
   * @param engine The engine which the post process will be applied. (default: current engine)
   * @param reusable If the post process can be reused on the same frame. (default: false)
   * @param textureType Type of textures used when performing the post process. (default: 0)
   * @param defines
   * @param _blockCompilation If compilation of the shader should not be done in the constructor. The updateEffect method can be used to compile the shader at a later time. (default: false)
   * @param textureFormat Format of textures used when performing the post process. (default: TEXTUREFORMAT_RGBA)
   */
  constructor(e, t, i, r, s, n = I.BILINEAR_SAMPLINGMODE, o, a, f = 0, c = "", d = !1, E = 5) {
    super(e, "kernelBlur", ["delta", "direction"], ["circleOfConfusionSampler"], r, s, n, o, a, null, f, "kernelBlur", { varyingCount: 0, depCount: 0 }, !0, E), this._blockCompilation = d, this._packedFloat = !1, this._staticDefines = "", this._staticDefines = c, this.direction = t, this.onApplyObservable.add((u) => {
      this._outputTexture ? u.setFloat2("delta", 1 / this._outputTexture.width * this.direction.x, 1 / this._outputTexture.height * this.direction.y) : u.setFloat2("delta", 1 / this.width * this.direction.x, 1 / this.height * this.direction.y);
    }), this.kernel = i;
  }
  /**
   * Updates the effect with the current post process compile time values and recompiles the shader.
   * @param defines Define statements that should be added at the beginning of the shader. (default: null)
   * @param uniforms Set of uniform variables that will be passed to the shader. (default: null)
   * @param samplers Set of Texture2D variables that will be passed to the shader. (default: null)
   * @param indexParameters The index parameters to be used for babylons include syntax "#include<kernelBlurVaryingDeclaration>[0..varyingCount]". (default: undefined) See usage in babylon.blurPostProcess.ts and kernelBlur.vertex.fx
   * @param onCompiled Called when the shader has been compiled.
   * @param onError Called if there is an error when compiling a shader.
   */
  updateEffect(e = null, t = null, i = null, r, s, n) {
    this._updateParameters(s, n);
  }
  _updateParameters(e, t) {
    const i = this._kernel, r = (i - 1) / 2;
    let s = [], n = [], o = 0;
    for (let A = 0; A < i; A++) {
      const R = A / (i - 1), N = this._gaussianWeight(R * 2 - 1);
      s[A] = A - r, n[A] = N, o += N;
    }
    for (let A = 0; A < n.length; A++)
      n[A] /= o;
    const a = [], f = [], c = [];
    for (let A = 0; A <= r; A += 2) {
      const R = Math.min(A + 1, Math.floor(r));
      if (A === R)
        c.push({ o: s[A], w: n[A] });
      else {
        const O = R === r, L = n[A] + n[R] * (O ? 0.5 : 1), U = s[A] + 1 / (1 + n[A] / n[R]);
        U === 0 ? (c.push({ o: s[A], w: n[A] }), c.push({ o: s[A + 1], w: n[A + 1] })) : (c.push({ o: U, w: L }), c.push({ o: -U, w: L }));
      }
    }
    for (let A = 0; A < c.length; A++)
      f[A] = c[A].o, a[A] = c[A].w;
    s = f, n = a;
    const d = this.getEngine().getCaps().maxVaryingVectors, E = Math.max(d, 0) - 1;
    let u = Math.min(s.length, E), _ = "";
    _ += this._staticDefines, this._staticDefines.indexOf("DOF") != -1 && (_ += `#define CENTER_WEIGHT ${this._glslFloat(n[u - 1])}\r
`, u--);
    for (let A = 0; A < u; A++)
      _ += `#define KERNEL_OFFSET${A} ${this._glslFloat(s[A])}\r
`, _ += `#define KERNEL_WEIGHT${A} ${this._glslFloat(n[A])}\r
`;
    let p = 0;
    for (let A = E; A < s.length; A++)
      _ += `#define KERNEL_DEP_OFFSET${p} ${this._glslFloat(s[A])}\r
`, _ += `#define KERNEL_DEP_WEIGHT${p} ${this._glslFloat(n[A])}\r
`, p++;
    this.packedFloat && (_ += "#define PACKEDFLOAT 1"), this._blockCompilation = !1, super.updateEffect(_, null, null, {
      varyingCount: u,
      depCount: p
    }, e, t);
  }
  /**
   * Best kernels are odd numbers that when divided by 2, their integer part is even, so 5, 9 or 13.
   * Other odd kernels optimize correctly but require proportionally more samples, even kernels are
   * possible but will produce minor visual artifacts. Since each new kernel requires a new shader we
   * want to minimize kernel changes, having gaps between physical kernels is helpful in that regard.
   * The gaps between physical kernels are compensated for in the weighting of the samples
   * @param idealKernel Ideal blur kernel.
   * @returns Nearest best kernel.
   */
  _nearestBestKernel(e) {
    const t = Math.round(e);
    for (const i of [t, t - 1, t + 1, t - 2, t + 2])
      if (i % 2 !== 0 && Math.floor(i / 2) % 2 === 0 && i > 0)
        return Math.max(i, 3);
    return Math.max(t, 3);
  }
  /**
   * Calculates the value of a Gaussian distribution with sigma 3 at a given point.
   * @param x The point on the Gaussian distribution to sample.
   * @returns the value of the Gaussian function at x.
   */
  _gaussianWeight(e) {
    const t = 0.3333333333333333, i = Math.sqrt(2 * Math.PI) * t, r = -(e * e / (2 * t * t));
    return 1 / i * Math.exp(r);
  }
  /**
   * Generates a string that can be used as a floating point number in GLSL.
   * @param x Value to print.
   * @param decimalFigures Number of decimal places to print the number to (excluding trailing 0s).
   * @returns GLSL float string.
   */
  _glslFloat(e, t = 8) {
    return e.toFixed(t).replace(/0+$/, "");
  }
  /**
   * @internal
   */
  static _Parse(e, t, i, r) {
    return j.Parse(() => new je(e.name, e.direction, e.kernel, e.options, t, e.renderTargetSamplingMode, i.getEngine(), e.reusable, e.textureType, void 0, !1), e, i, r);
  }
}
h([
  T("kernel")
], je.prototype, "_kernel", void 0);
h([
  T("packedFloat")
], je.prototype, "_packedFloat", void 0);
h([
  Di()
], je.prototype, "direction", void 0);
Fe("BABYLON.BlurPostProcess", je);
class Ht {
  constructor() {
    this._defines = {}, this._currentRank = 32, this._maxRank = -1, this._mesh = null;
  }
  /**
   * Removes the fallback from the bound mesh.
   */
  unBindMesh() {
    this._mesh = null;
  }
  /**
   * Adds a fallback on the specified property.
   * @param rank The rank of the fallback (Lower ranks will be fallbacked to first)
   * @param define The name of the define in the shader
   */
  addFallback(e, t) {
    this._defines[e] || (e < this._currentRank && (this._currentRank = e), e > this._maxRank && (this._maxRank = e), this._defines[e] = new Array()), this._defines[e].push(t);
  }
  /**
   * Sets the mesh to use CPU skinning when needing to fallback.
   * @param rank The rank of the fallback (Lower ranks will be fallbacked to first)
   * @param mesh The mesh to use the fallbacks.
   */
  addCPUSkinningFallback(e, t) {
    this._mesh = t, e < this._currentRank && (this._currentRank = e), e > this._maxRank && (this._maxRank = e);
  }
  /**
   * Checks to see if more fallbacks are still available.
   */
  get hasMoreFallbacks() {
    return this._currentRank <= this._maxRank;
  }
  /**
   * Removes the defines that should be removed when falling back.
   * @param currentDefines defines the current define statements for the shader.
   * @param effect defines the current effect we try to compile
   * @returns The resulting defines with defines of the current rank removed.
   */
  reduce(e, t) {
    if (this._mesh && this._mesh.computeBonesUsingShaders && this._mesh.numBoneInfluencers > 0) {
      this._mesh.computeBonesUsingShaders = !1, e = e.replace("#define NUM_BONE_INFLUENCERS " + this._mesh.numBoneInfluencers, "#define NUM_BONE_INFLUENCERS 0"), t._bonesComputationForcedToCPU = !0;
      const i = this._mesh.getScene();
      for (let r = 0; r < i.meshes.length; r++) {
        const s = i.meshes[r];
        if (!s.material) {
          !this._mesh.material && s.computeBonesUsingShaders && s.numBoneInfluencers > 0 && (s.computeBonesUsingShaders = !1);
          continue;
        }
        if (!(!s.computeBonesUsingShaders || s.numBoneInfluencers === 0)) {
          if (s.material.getEffect() === t)
            s.computeBonesUsingShaders = !1;
          else if (s.subMeshes) {
            for (const n of s.subMeshes)
              if (n.effect === t) {
                s.computeBonesUsingShaders = !1;
                break;
              }
          }
        }
      }
    } else {
      const i = this._defines[this._currentRank];
      if (i)
        for (let r = 0; r < i.length; r++)
          e = e.replace("#define " + i[r], "");
      this._currentRank++;
    }
    return e;
  }
}
const Fr = "bayerDitherFunctions", yr = `float bayerDither2(vec2 _P) {
return mod(2.0*_P.y+_P.x+1.0,4.0);
}
float bayerDither4(vec2 _P) {
vec2 P1=mod(_P,2.0); 
vec2 P2=floor(0.5*mod(_P,4.0)); 
return 4.0*bayerDither2(P1)+bayerDither2(P2);
}
float bayerDither8(vec2 _P) {
vec2 P1=mod(_P,2.0); 
vec2 P2=floor(0.5 *mod(_P,4.0)); 
vec2 P4=floor(0.25*mod(_P,8.0)); 
return 4.0*(4.0*bayerDither2(P1)+bayerDither2(P2))+bayerDither2(P4);
}
`;
C.IncludesShadersStore[Fr] = yr;
const Ur = "shadowMapFragmentExtraDeclaration", wr = `#if SM_FLOAT==0
#include<packingFunctions>
#endif
#if SM_SOFTTRANSPARENTSHADOW==1
#include<bayerDitherFunctions>
uniform float softTransparentShadowSM;
#endif
varying float vDepthMetricSM;
#if SM_USEDISTANCE==1
uniform vec3 lightDataSM;
varying vec3 vPositionWSM;
#endif
uniform vec3 biasAndScaleSM;
uniform vec2 depthValuesSM;
#if defined(SM_DEPTHCLAMP) && SM_DEPTHCLAMP==1
varying float zSM;
#endif
`;
C.IncludesShadersStore[Ur] = wr;
const Br = "clipPlaneFragmentDeclaration", Vr = `#ifdef CLIPPLANE
varying float fClipDistance;
#endif
#ifdef CLIPPLANE2
varying float fClipDistance2;
#endif
#ifdef CLIPPLANE3
varying float fClipDistance3;
#endif
#ifdef CLIPPLANE4
varying float fClipDistance4;
#endif
#ifdef CLIPPLANE5
varying float fClipDistance5;
#endif
#ifdef CLIPPLANE6
varying float fClipDistance6;
#endif
`;
C.IncludesShadersStore[Br] = Vr;
const Gr = "clipPlaneFragment", Xr = `#if defined(CLIPPLANE) || defined(CLIPPLANE2) || defined(CLIPPLANE3) || defined(CLIPPLANE4) || defined(CLIPPLANE5) || defined(CLIPPLANE6)
if (false) {}
#endif
#ifdef CLIPPLANE
else if (fClipDistance>0.0)
{
discard;
}
#endif
#ifdef CLIPPLANE2
else if (fClipDistance2>0.0)
{
discard;
}
#endif
#ifdef CLIPPLANE3
else if (fClipDistance3>0.0)
{
discard;
}
#endif
#ifdef CLIPPLANE4
else if (fClipDistance4>0.0)
{
discard;
}
#endif
#ifdef CLIPPLANE5
else if (fClipDistance5>0.0)
{
discard;
}
#endif
#ifdef CLIPPLANE6
else if (fClipDistance6>0.0)
{
discard;
}
#endif
`;
C.IncludesShadersStore[Gr] = Xr;
const Hr = "shadowMapFragment", kr = `float depthSM=vDepthMetricSM;
#if defined(SM_DEPTHCLAMP) && SM_DEPTHCLAMP==1
#if SM_USEDISTANCE==1
depthSM=(length(vPositionWSM-lightDataSM)+depthValuesSM.x)/depthValuesSM.y+biasAndScaleSM.x;
#else
#ifdef USE_REVERSE_DEPTHBUFFER
depthSM=(-zSM+depthValuesSM.x)/depthValuesSM.y+biasAndScaleSM.x;
#else
depthSM=(zSM+depthValuesSM.x)/depthValuesSM.y+biasAndScaleSM.x;
#endif
#endif
#ifdef USE_REVERSE_DEPTHBUFFER
gl_FragDepth=clamp(1.0-depthSM,0.0,1.0);
#else
gl_FragDepth=clamp(depthSM,0.0,1.0); 
#endif
#elif SM_USEDISTANCE==1
depthSM=(length(vPositionWSM-lightDataSM)+depthValuesSM.x)/depthValuesSM.y+biasAndScaleSM.x;
#endif
#if SM_ESM==1
depthSM=clamp(exp(-min(87.,biasAndScaleSM.z*depthSM)),0.,1.);
#endif
#if SM_FLOAT==1
gl_FragColor=vec4(depthSM,1.0,1.0,1.0);
#else
gl_FragColor=pack(depthSM);
#endif
return;`;
C.IncludesShadersStore[Hr] = kr;
const zr = "shadowMapPixelShader", Wr = `#include<shadowMapFragmentExtraDeclaration>
#ifdef ALPHATEXTURE
varying vec2 vUV;
uniform sampler2D diffuseSampler;
#endif
#include<clipPlaneFragmentDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{
#include<clipPlaneFragment>
#ifdef ALPHATEXTURE
float alphaFromAlphaTexture=texture2D(diffuseSampler,vUV).a;
#ifdef ALPHATESTVALUE
if (alphaFromAlphaTexture<ALPHATESTVALUE)
discard;
#endif
#endif
#if SM_SOFTTRANSPARENTSHADOW==1
#ifdef ALPHATEXTURE
if ((bayerDither8(floor(mod(gl_FragCoord.xy,8.0))))/64.0>=softTransparentShadowSM*alphaFromAlphaTexture) discard;
#else
if ((bayerDither8(floor(mod(gl_FragCoord.xy,8.0))))/64.0>=softTransparentShadowSM) discard;
#endif
#endif
#include<shadowMapFragment>
}`;
C.ShadersStore[zr] = Wr;
const Yr = "bonesDeclaration", Qr = `#if NUM_BONE_INFLUENCERS>0
attribute vec4 matricesIndices;
attribute vec4 matricesWeights;
#if NUM_BONE_INFLUENCERS>4
attribute vec4 matricesIndicesExtra;
attribute vec4 matricesWeightsExtra;
#endif
#ifndef BAKED_VERTEX_ANIMATION_TEXTURE
#ifdef BONETEXTURE
uniform sampler2D boneSampler;
uniform float boneTextureWidth;
#else
uniform mat4 mBones[BonesPerMesh];
#ifdef BONES_VELOCITY_ENABLED
uniform mat4 mPreviousBones[BonesPerMesh];
#endif
#endif
#ifdef BONETEXTURE
#define inline
mat4 readMatrixFromRawSampler(sampler2D smp,float index)
{
float offset=index *4.0;
float dx=1.0/boneTextureWidth;
vec4 m0=texture2D(smp,vec2(dx*(offset+0.5),0.));
vec4 m1=texture2D(smp,vec2(dx*(offset+1.5),0.));
vec4 m2=texture2D(smp,vec2(dx*(offset+2.5),0.));
vec4 m3=texture2D(smp,vec2(dx*(offset+3.5),0.));
return mat4(m0,m1,m2,m3);
}
#endif
#endif
#endif
`;
C.IncludesShadersStore[Yr] = Qr;
const Kr = "bakedVertexAnimationDeclaration", Zr = `#ifdef BAKED_VERTEX_ANIMATION_TEXTURE
uniform float bakedVertexAnimationTime;
uniform vec2 bakedVertexAnimationTextureSizeInverted;
uniform vec4 bakedVertexAnimationSettings;
uniform sampler2D bakedVertexAnimationTexture;
#ifdef INSTANCES
attribute vec4 bakedVertexAnimationSettingsInstanced;
#endif
#define inline
mat4 readMatrixFromRawSamplerVAT(sampler2D smp,float index,float frame)
{
float offset=index*4.0;
float frameUV=(frame+0.5)*bakedVertexAnimationTextureSizeInverted.y;
float dx=bakedVertexAnimationTextureSizeInverted.x;
vec4 m0=texture2D(smp,vec2(dx*(offset+0.5),frameUV));
vec4 m1=texture2D(smp,vec2(dx*(offset+1.5),frameUV));
vec4 m2=texture2D(smp,vec2(dx*(offset+2.5),frameUV));
vec4 m3=texture2D(smp,vec2(dx*(offset+3.5),frameUV));
return mat4(m0,m1,m2,m3);
}
#endif
`;
C.IncludesShadersStore[Kr] = Zr;
const jr = "morphTargetsVertexGlobalDeclaration", qr = `#ifdef MORPHTARGETS
uniform float morphTargetInfluences[NUM_MORPH_INFLUENCERS];
#ifdef MORPHTARGETS_TEXTURE 
precision mediump sampler2DArray; 
uniform float morphTargetTextureIndices[NUM_MORPH_INFLUENCERS];
uniform vec3 morphTargetTextureInfo;
uniform sampler2DArray morphTargets;
vec3 readVector3FromRawSampler(int targetIndex,float vertexIndex)
{ 
float y=floor(vertexIndex/morphTargetTextureInfo.y);
float x=vertexIndex-y*morphTargetTextureInfo.y;
vec3 textureUV=vec3((x+0.5)/morphTargetTextureInfo.y,(y+0.5)/morphTargetTextureInfo.z,morphTargetTextureIndices[targetIndex]);
return texture(morphTargets,textureUV).xyz;
}
#endif
#endif
`;
C.IncludesShadersStore[jr] = qr;
const Jr = "morphTargetsVertexDeclaration", $r = `#ifdef MORPHTARGETS
#ifndef MORPHTARGETS_TEXTURE
attribute vec3 position{X};
#ifdef MORPHTARGETS_NORMAL
attribute vec3 normal{X};
#endif
#ifdef MORPHTARGETS_TANGENT
attribute vec3 tangent{X};
#endif
#ifdef MORPHTARGETS_UV
attribute vec2 uv_{X};
#endif
#endif
#endif
`;
C.IncludesShadersStore[Jr] = $r;
const es = "helperFunctions", ts = `const float PI=3.1415926535897932384626433832795;
const float HALF_MIN=5.96046448e-08; 
const float LinearEncodePowerApprox=2.2;
const float GammaEncodePowerApprox=1.0/LinearEncodePowerApprox;
const vec3 LuminanceEncodeApprox=vec3(0.2126,0.7152,0.0722);
const float Epsilon=0.0000001;
#define saturate(x) clamp(x,0.0,1.0)
#define absEps(x) abs(x)+Epsilon
#define maxEps(x) max(x,Epsilon)
#define saturateEps(x) clamp(x,Epsilon,1.0)
mat3 transposeMat3(mat3 inMatrix) {
vec3 i0=inMatrix[0];
vec3 i1=inMatrix[1];
vec3 i2=inMatrix[2];
mat3 outMatrix=mat3(
vec3(i0.x,i1.x,i2.x),
vec3(i0.y,i1.y,i2.y),
vec3(i0.z,i1.z,i2.z)
);
return outMatrix;
}
mat3 inverseMat3(mat3 inMatrix) {
float a00=inMatrix[0][0],a01=inMatrix[0][1],a02=inMatrix[0][2];
float a10=inMatrix[1][0],a11=inMatrix[1][1],a12=inMatrix[1][2];
float a20=inMatrix[2][0],a21=inMatrix[2][1],a22=inMatrix[2][2];
float b01=a22*a11-a12*a21;
float b11=-a22*a10+a12*a20;
float b21=a21*a10-a11*a20;
float det=a00*b01+a01*b11+a02*b21;
return mat3(b01,(-a22*a01+a02*a21),(a12*a01-a02*a11),
b11,(a22*a00-a02*a20),(-a12*a00+a02*a10),
b21,(-a21*a00+a01*a20),(a11*a00-a01*a10))/det;
}
#if USE_EXACT_SRGB_CONVERSIONS
vec3 toLinearSpaceExact(vec3 color)
{
vec3 nearZeroSection=0.0773993808*color;
vec3 remainingSection=pow(0.947867299*(color+vec3(0.055)),vec3(2.4));
#if defined(WEBGL2) || defined(WEBGPU) || defined(NATIVE)
return mix(remainingSection,nearZeroSection,lessThanEqual(color,vec3(0.04045)));
#else
return
vec3(
color.r<=0.04045 ? nearZeroSection.r : remainingSection.r,
color.g<=0.04045 ? nearZeroSection.g : remainingSection.g,
color.b<=0.04045 ? nearZeroSection.b : remainingSection.b);
#endif
}
vec3 toGammaSpaceExact(vec3 color)
{
vec3 nearZeroSection=12.92*color;
vec3 remainingSection=1.055*pow(color,vec3(0.41666))-vec3(0.055);
#if defined(WEBGL2) || defined(WEBGPU) || defined(NATIVE)
return mix(remainingSection,nearZeroSection,lessThanEqual(color,vec3(0.0031308)));
#else
return
vec3(
color.r<=0.0031308 ? nearZeroSection.r : remainingSection.r,
color.g<=0.0031308 ? nearZeroSection.g : remainingSection.g,
color.b<=0.0031308 ? nearZeroSection.b : remainingSection.b);
#endif
}
#endif
float toLinearSpace(float color)
{
#if USE_EXACT_SRGB_CONVERSIONS
float nearZeroSection=0.0773993808*color;
float remainingSection=pow(0.947867299*(color+0.055),2.4);
return color<=0.04045 ? nearZeroSection : remainingSection;
#else
return pow(color,LinearEncodePowerApprox);
#endif
}
vec3 toLinearSpace(vec3 color)
{
#if USE_EXACT_SRGB_CONVERSIONS
return toLinearSpaceExact(color);
#else
return pow(color,vec3(LinearEncodePowerApprox));
#endif
}
vec4 toLinearSpace(vec4 color)
{
#if USE_EXACT_SRGB_CONVERSIONS
return vec4(toLinearSpaceExact(color.rgb),color.a);
#else
return vec4(pow(color.rgb,vec3(LinearEncodePowerApprox)),color.a);
#endif
}
float toGammaSpace(float color)
{
#if USE_EXACT_SRGB_CONVERSIONS
float nearZeroSection=12.92*color;
float remainingSection=1.055*pow(color,0.41666)-0.055;
return color<=0.0031308 ? nearZeroSection : remainingSection;
#else
return pow(color,GammaEncodePowerApprox);
#endif
}
vec3 toGammaSpace(vec3 color)
{
#if USE_EXACT_SRGB_CONVERSIONS
return toGammaSpaceExact(color);
#else
return pow(color,vec3(GammaEncodePowerApprox));
#endif
}
vec4 toGammaSpace(vec4 color)
{
#if USE_EXACT_SRGB_CONVERSIONS
return vec4(toGammaSpaceExact(color.rgb),color.a);
#else
return vec4(pow(color.rgb,vec3(GammaEncodePowerApprox)),color.a);
#endif
}
float square(float value)
{
return value*value;
}
vec3 square(vec3 value)
{
return value*value;
}
float pow5(float value) {
float sq=value*value;
return sq*sq*value;
}
float getLuminance(vec3 color)
{
return clamp(dot(color,LuminanceEncodeApprox),0.,1.);
}
float getRand(vec2 seed) {
return fract(sin(dot(seed.xy ,vec2(12.9898,78.233)))*43758.5453);
}
float dither(vec2 seed,float varianceAmount) {
float rand=getRand(seed);
float normVariance=varianceAmount/255.0;
float dither=mix(-normVariance,normVariance,rand);
return dither;
}
const float rgbdMaxRange=255.0;
vec4 toRGBD(vec3 color) {
float maxRGB=maxEps(max(color.r,max(color.g,color.b)));
float D =max(rgbdMaxRange/maxRGB,1.);
D =clamp(floor(D)/255.0,0.,1.);
vec3 rgb=color.rgb*D;
rgb=toGammaSpace(rgb);
return vec4(clamp(rgb,0.,1.),D); 
}
vec3 fromRGBD(vec4 rgbd) {
rgbd.rgb=toLinearSpace(rgbd.rgb);
return rgbd.rgb/rgbd.a;
}
vec3 parallaxCorrectNormal( vec3 vertexPos,vec3 origVec,vec3 cubeSize,vec3 cubePos ) {
vec3 invOrigVec=vec3(1.0,1.0,1.0)/origVec;
vec3 halfSize=cubeSize*0.5;
vec3 intersecAtMaxPlane=(cubePos+halfSize-vertexPos)*invOrigVec;
vec3 intersecAtMinPlane=(cubePos-halfSize-vertexPos)*invOrigVec;
vec3 largestIntersec=max(intersecAtMaxPlane,intersecAtMinPlane);
float distance=min(min(largestIntersec.x,largestIntersec.y),largestIntersec.z);
vec3 intersectPositionWS=vertexPos+origVec*distance;
return intersectPositionWS-cubePos;
}
`;
C.IncludesShadersStore[es] = ts;
const is = "sceneVertexDeclaration", rs = `uniform mat4 viewProjection;
#ifdef MULTIVIEW
uniform mat4 viewProjectionR;
#endif
uniform mat4 view;
uniform mat4 projection;
uniform vec4 vEyePosition;
`;
C.IncludesShadersStore[is] = rs;
const ss = "meshVertexDeclaration", ns = `uniform mat4 world;
uniform float visibility;
`;
C.IncludesShadersStore[ss] = ns;
const as = "shadowMapVertexDeclaration", os = `#include<sceneVertexDeclaration>
#include<meshVertexDeclaration>
`;
C.IncludesShadersStore[as] = os;
const ls = "sceneUboDeclaration", fs = `layout(std140,column_major) uniform;
uniform Scene {
mat4 viewProjection;
#ifdef MULTIVIEW
mat4 viewProjectionR;
#endif 
mat4 view;
mat4 projection;
vec4 vEyePosition;
};
`;
C.IncludesShadersStore[ls] = fs;
const cs = "meshUboDeclaration", ds = `#ifdef WEBGL2
uniform mat4 world;
uniform float visibility;
#else
layout(std140,column_major) uniform;
uniform Mesh
{
mat4 world;
float visibility;
};
#endif
#define WORLD_UBO
`;
C.IncludesShadersStore[cs] = ds;
const hs = "shadowMapUboDeclaration", us = `layout(std140,column_major) uniform;
#include<sceneUboDeclaration>
#include<meshUboDeclaration>
`;
C.IncludesShadersStore[hs] = us;
const Es = "shadowMapVertexExtraDeclaration", _s = `#if SM_NORMALBIAS==1
uniform vec3 lightDataSM;
#endif
uniform vec3 biasAndScaleSM;
uniform vec2 depthValuesSM;
varying float vDepthMetricSM;
#if SM_USEDISTANCE==1
varying vec3 vPositionWSM;
#endif
#if defined(SM_DEPTHCLAMP) && SM_DEPTHCLAMP==1
varying float zSM;
#endif
`;
C.IncludesShadersStore[Es] = _s;
const ms = "clipPlaneVertexDeclaration", ps = `#ifdef CLIPPLANE
uniform vec4 vClipPlane;
varying float fClipDistance;
#endif
#ifdef CLIPPLANE2
uniform vec4 vClipPlane2;
varying float fClipDistance2;
#endif
#ifdef CLIPPLANE3
uniform vec4 vClipPlane3;
varying float fClipDistance3;
#endif
#ifdef CLIPPLANE4
uniform vec4 vClipPlane4;
varying float fClipDistance4;
#endif
#ifdef CLIPPLANE5
uniform vec4 vClipPlane5;
varying float fClipDistance5;
#endif
#ifdef CLIPPLANE6
uniform vec4 vClipPlane6;
varying float fClipDistance6;
#endif
`;
C.IncludesShadersStore[ms] = ps;
const Ts = "morphTargetsVertexGlobal", As = `#ifdef MORPHTARGETS
#ifdef MORPHTARGETS_TEXTURE
float vertexID;
#endif
#endif
`;
C.IncludesShadersStore[Ts] = As;
const gs = "morphTargetsVertex", Ss = `#ifdef MORPHTARGETS
#ifdef MORPHTARGETS_TEXTURE 
vertexID=float(gl_VertexID)*morphTargetTextureInfo.x;
positionUpdated+=(readVector3FromRawSampler({X},vertexID)-position)*morphTargetInfluences[{X}];
vertexID+=1.0;
#ifdef MORPHTARGETS_NORMAL
normalUpdated+=(readVector3FromRawSampler({X},vertexID) -normal)*morphTargetInfluences[{X}];
vertexID+=1.0;
#endif
#ifdef MORPHTARGETS_UV
uvUpdated+=(readVector3FromRawSampler({X},vertexID).xy-uv)*morphTargetInfluences[{X}];
vertexID+=1.0;
#endif
#ifdef MORPHTARGETS_TANGENT
tangentUpdated.xyz+=(readVector3FromRawSampler({X},vertexID) -tangent.xyz)*morphTargetInfluences[{X}];
#endif
#else
positionUpdated+=(position{X}-position)*morphTargetInfluences[{X}];
#ifdef MORPHTARGETS_NORMAL
normalUpdated+=(normal{X}-normal)*morphTargetInfluences[{X}];
#endif
#ifdef MORPHTARGETS_TANGENT
tangentUpdated.xyz+=(tangent{X}-tangent.xyz)*morphTargetInfluences[{X}];
#endif
#ifdef MORPHTARGETS_UV
uvUpdated+=(uv_{X}-uv)*morphTargetInfluences[{X}];
#endif
#endif
#endif
`;
C.IncludesShadersStore[gs] = Ss;
const Rs = "instancesVertex", Cs = `#ifdef INSTANCES
mat4 finalWorld=mat4(world0,world1,world2,world3);
#if defined(PREPASS_VELOCITY) || defined(VELOCITY)
mat4 finalPreviousWorld=mat4(previousWorld0,previousWorld1,previousWorld2,previousWorld3);
#endif
#ifdef THIN_INSTANCES
finalWorld=world*finalWorld;
#if defined(PREPASS_VELOCITY) || defined(VELOCITY)
finalPreviousWorld=previousWorld*finalPreviousWorld;
#endif
#endif
#else
mat4 finalWorld=world;
#if defined(PREPASS_VELOCITY) || defined(VELOCITY)
mat4 finalPreviousWorld=previousWorld;
#endif
#endif
`;
C.IncludesShadersStore[Rs] = Cs;
const vs = "bonesVertex", Is = `#ifndef BAKED_VERTEX_ANIMATION_TEXTURE
#if NUM_BONE_INFLUENCERS>0
mat4 influence;
#ifdef BONETEXTURE
influence=readMatrixFromRawSampler(boneSampler,matricesIndices[0])*matricesWeights[0];
#if NUM_BONE_INFLUENCERS>1
influence+=readMatrixFromRawSampler(boneSampler,matricesIndices[1])*matricesWeights[1];
#endif
#if NUM_BONE_INFLUENCERS>2
influence+=readMatrixFromRawSampler(boneSampler,matricesIndices[2])*matricesWeights[2];
#endif
#if NUM_BONE_INFLUENCERS>3
influence+=readMatrixFromRawSampler(boneSampler,matricesIndices[3])*matricesWeights[3];
#endif
#if NUM_BONE_INFLUENCERS>4
influence+=readMatrixFromRawSampler(boneSampler,matricesIndicesExtra[0])*matricesWeightsExtra[0];
#endif
#if NUM_BONE_INFLUENCERS>5
influence+=readMatrixFromRawSampler(boneSampler,matricesIndicesExtra[1])*matricesWeightsExtra[1];
#endif
#if NUM_BONE_INFLUENCERS>6
influence+=readMatrixFromRawSampler(boneSampler,matricesIndicesExtra[2])*matricesWeightsExtra[2];
#endif
#if NUM_BONE_INFLUENCERS>7
influence+=readMatrixFromRawSampler(boneSampler,matricesIndicesExtra[3])*matricesWeightsExtra[3];
#endif
#else
influence=mBones[int(matricesIndices[0])]*matricesWeights[0];
#if NUM_BONE_INFLUENCERS>1
influence+=mBones[int(matricesIndices[1])]*matricesWeights[1];
#endif
#if NUM_BONE_INFLUENCERS>2
influence+=mBones[int(matricesIndices[2])]*matricesWeights[2];
#endif
#if NUM_BONE_INFLUENCERS>3
influence+=mBones[int(matricesIndices[3])]*matricesWeights[3];
#endif
#if NUM_BONE_INFLUENCERS>4
influence+=mBones[int(matricesIndicesExtra[0])]*matricesWeightsExtra[0];
#endif
#if NUM_BONE_INFLUENCERS>5
influence+=mBones[int(matricesIndicesExtra[1])]*matricesWeightsExtra[1];
#endif
#if NUM_BONE_INFLUENCERS>6
influence+=mBones[int(matricesIndicesExtra[2])]*matricesWeightsExtra[2];
#endif
#if NUM_BONE_INFLUENCERS>7
influence+=mBones[int(matricesIndicesExtra[3])]*matricesWeightsExtra[3];
#endif
#endif
finalWorld=finalWorld*influence;
#endif
#endif
`;
C.IncludesShadersStore[vs] = Is;
const Ms = "bakedVertexAnimation", xs = `#ifdef BAKED_VERTEX_ANIMATION_TEXTURE
{
#ifdef INSTANCES
#define BVASNAME bakedVertexAnimationSettingsInstanced
#else
#define BVASNAME bakedVertexAnimationSettings
#endif
float VATStartFrame=BVASNAME.x;
float VATEndFrame=BVASNAME.y;
float VATOffsetFrame=BVASNAME.z;
float VATSpeed=BVASNAME.w;
float totalFrames=VATEndFrame-VATStartFrame+1.0;
float time=bakedVertexAnimationTime*VATSpeed/totalFrames;
float frameCorrection=time<1.0 ? 0.0 : 1.0;
float numOfFrames=totalFrames-frameCorrection;
float VATFrameNum=fract(time)*numOfFrames;
VATFrameNum=mod(VATFrameNum+VATOffsetFrame,numOfFrames);
VATFrameNum=floor(VATFrameNum);
VATFrameNum+=VATStartFrame+frameCorrection;
mat4 VATInfluence;
VATInfluence=readMatrixFromRawSamplerVAT(bakedVertexAnimationTexture,matricesIndices[0],VATFrameNum)*matricesWeights[0];
#if NUM_BONE_INFLUENCERS>1
VATInfluence+=readMatrixFromRawSamplerVAT(bakedVertexAnimationTexture,matricesIndices[1],VATFrameNum)*matricesWeights[1];
#endif
#if NUM_BONE_INFLUENCERS>2
VATInfluence+=readMatrixFromRawSamplerVAT(bakedVertexAnimationTexture,matricesIndices[2],VATFrameNum)*matricesWeights[2];
#endif
#if NUM_BONE_INFLUENCERS>3
VATInfluence+=readMatrixFromRawSamplerVAT(bakedVertexAnimationTexture,matricesIndices[3],VATFrameNum)*matricesWeights[3];
#endif
#if NUM_BONE_INFLUENCERS>4
VATInfluence+=readMatrixFromRawSamplerVAT(bakedVertexAnimationTexture,matricesIndicesExtra[0],VATFrameNum)*matricesWeightsExtra[0];
#endif
#if NUM_BONE_INFLUENCERS>5
VATInfluence+=readMatrixFromRawSamplerVAT(bakedVertexAnimationTexture,matricesIndicesExtra[1],VATFrameNum)*matricesWeightsExtra[1];
#endif
#if NUM_BONE_INFLUENCERS>6
VATInfluence+=readMatrixFromRawSamplerVAT(bakedVertexAnimationTexture,matricesIndicesExtra[2],VATFrameNum)*matricesWeightsExtra[2];
#endif
#if NUM_BONE_INFLUENCERS>7
VATInfluence+=readMatrixFromRawSamplerVAT(bakedVertexAnimationTexture,matricesIndicesExtra[3],VATFrameNum)*matricesWeightsExtra[3];
#endif
finalWorld=finalWorld*VATInfluence;
}
#endif
`;
C.IncludesShadersStore[Ms] = xs;
const Ns = "shadowMapVertexNormalBias", Os = `#if SM_NORMALBIAS==1
#if SM_DIRECTIONINLIGHTDATA==1
vec3 worldLightDirSM=normalize(-lightDataSM.xyz);
#else
vec3 directionToLightSM=lightDataSM.xyz-worldPos.xyz;
vec3 worldLightDirSM=normalize(directionToLightSM);
#endif
float ndlSM=dot(vNormalW,worldLightDirSM);
float sinNLSM=sqrt(1.0-ndlSM*ndlSM);
float normalBiasSM=biasAndScaleSM.y*sinNLSM;
worldPos.xyz-=vNormalW*normalBiasSM;
#endif
`;
C.IncludesShadersStore[Ns] = Os;
const Ls = "shadowMapVertexMetric", Ds = `#if SM_USEDISTANCE==1
vPositionWSM=worldPos.xyz;
#endif
#if SM_DEPTHTEXTURE==1
#ifdef IS_NDC_HALF_ZRANGE
#define BIASFACTOR 0.5
#else
#define BIASFACTOR 1.0
#endif
#ifdef USE_REVERSE_DEPTHBUFFER
gl_Position.z-=biasAndScaleSM.x*gl_Position.w*BIASFACTOR;
#else
gl_Position.z+=biasAndScaleSM.x*gl_Position.w*BIASFACTOR;
#endif
#endif
#if defined(SM_DEPTHCLAMP) && SM_DEPTHCLAMP==1
zSM=gl_Position.z;
gl_Position.z=0.0;
#elif SM_USEDISTANCE==0
#ifdef USE_REVERSE_DEPTHBUFFER
vDepthMetricSM=(-gl_Position.z+depthValuesSM.x)/depthValuesSM.y+biasAndScaleSM.x;
#else
vDepthMetricSM=(gl_Position.z+depthValuesSM.x)/depthValuesSM.y+biasAndScaleSM.x;
#endif
#endif
`;
C.IncludesShadersStore[Ls] = Ds;
const Ps = "clipPlaneVertex", bs = `#ifdef CLIPPLANE
fClipDistance=dot(worldPos,vClipPlane);
#endif
#ifdef CLIPPLANE2
fClipDistance2=dot(worldPos,vClipPlane2);
#endif
#ifdef CLIPPLANE3
fClipDistance3=dot(worldPos,vClipPlane3);
#endif
#ifdef CLIPPLANE4
fClipDistance4=dot(worldPos,vClipPlane4);
#endif
#ifdef CLIPPLANE5
fClipDistance5=dot(worldPos,vClipPlane5);
#endif
#ifdef CLIPPLANE6
fClipDistance6=dot(worldPos,vClipPlane6);
#endif
`;
C.IncludesShadersStore[Ps] = bs;
const Fs = "shadowMapVertexShader", ys = `attribute vec3 position;
#ifdef NORMAL
attribute vec3 normal;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#ifdef INSTANCES
attribute vec4 world0;
attribute vec4 world1;
attribute vec4 world2;
attribute vec4 world3;
#endif
#include<helperFunctions>
#include<__decl__shadowMapVertex>
#ifdef ALPHATEXTURE
varying vec2 vUV;
uniform mat4 diffuseMatrix;
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#endif
#include<shadowMapVertexExtraDeclaration>
#include<clipPlaneVertexDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
void main(void)
{
vec3 positionUpdated=position;
#ifdef UV1
vec2 uvUpdated=uv;
#endif
#ifdef NORMAL
vec3 normalUpdated=normal;
#endif
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(positionUpdated,1.0);
#ifdef NORMAL
mat3 normWorldSM=mat3(finalWorld);
#if defined(INSTANCES) && defined(THIN_INSTANCES)
vec3 vNormalW=normalUpdated/vec3(dot(normWorldSM[0],normWorldSM[0]),dot(normWorldSM[1],normWorldSM[1]),dot(normWorldSM[2],normWorldSM[2]));
vNormalW=normalize(normWorldSM*vNormalW);
#else
#ifdef NONUNIFORMSCALING
normWorldSM=transposeMat3(inverseMat3(normWorldSM));
#endif
vec3 vNormalW=normalize(normWorldSM*normalUpdated);
#endif
#endif
#include<shadowMapVertexNormalBias>
gl_Position=viewProjection*worldPos;
#include<shadowMapVertexMetric>
#ifdef ALPHATEXTURE
#ifdef UV1
vUV=vec2(diffuseMatrix*vec4(uvUpdated,1.0,0.0));
#endif
#ifdef UV2
vUV=vec2(diffuseMatrix*vec4(uv2,1.0,0.0));
#endif
#endif
#include<clipPlaneVertex>
}`;
C.ShadersStore[Fs] = ys;
const Us = "depthBoxBlurPixelShader", ws = `varying vec2 vUV;
uniform sampler2D textureSampler;
uniform vec2 screenSize;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{
vec4 colorDepth=vec4(0.0);
for (int x=-OFFSET; x<=OFFSET; x++)
for (int y=-OFFSET; y<=OFFSET; y++)
colorDepth+=texture2D(textureSampler,vUV+vec2(x,y)/screenSize);
gl_FragColor=(colorDepth/float((OFFSET*2+1)*(OFFSET*2+1)));
}`;
C.ShadersStore[Us] = ws;
const Bs = "shadowMapFragmentSoftTransparentShadow", Vs = `#if SM_SOFTTRANSPARENTSHADOW==1
if ((bayerDither8(floor(mod(gl_FragCoord.xy,8.0))))/64.0>=softTransparentShadowSM*alpha) discard;
#endif
`;
C.IncludesShadersStore[Bs] = Vs;
class P {
  /**
   * Gets the bias: offset applied on the depth preventing acnea (in light direction).
   */
  get bias() {
    return this._bias;
  }
  /**
   * Sets the bias: offset applied on the depth preventing acnea (in light direction).
   */
  set bias(e) {
    this._bias = e;
  }
  /**
   * Gets the normalBias: offset applied on the depth preventing acnea (along side the normal direction and proportional to the light/normal angle).
   */
  get normalBias() {
    return this._normalBias;
  }
  /**
   * Sets the normalBias: offset applied on the depth preventing acnea (along side the normal direction and proportional to the light/normal angle).
   */
  set normalBias(e) {
    this._normalBias = e;
  }
  /**
   * Gets the blur box offset: offset applied during the blur pass.
   * Only useful if useKernelBlur = false
   */
  get blurBoxOffset() {
    return this._blurBoxOffset;
  }
  /**
   * Sets the blur box offset: offset applied during the blur pass.
   * Only useful if useKernelBlur = false
   */
  set blurBoxOffset(e) {
    this._blurBoxOffset !== e && (this._blurBoxOffset = e, this._disposeBlurPostProcesses());
  }
  /**
   * Gets the blur scale: scale of the blurred texture compared to the main shadow map.
   * 2 means half of the size.
   */
  get blurScale() {
    return this._blurScale;
  }
  /**
   * Sets the blur scale: scale of the blurred texture compared to the main shadow map.
   * 2 means half of the size.
   */
  set blurScale(e) {
    this._blurScale !== e && (this._blurScale = e, this._disposeBlurPostProcesses());
  }
  /**
   * Gets the blur kernel: kernel size of the blur pass.
   * Only useful if useKernelBlur = true
   */
  get blurKernel() {
    return this._blurKernel;
  }
  /**
   * Sets the blur kernel: kernel size of the blur pass.
   * Only useful if useKernelBlur = true
   */
  set blurKernel(e) {
    this._blurKernel !== e && (this._blurKernel = e, this._disposeBlurPostProcesses());
  }
  /**
   * Gets whether the blur pass is a kernel blur (if true) or box blur.
   * Only useful in filtered mode (useBlurExponentialShadowMap...)
   */
  get useKernelBlur() {
    return this._useKernelBlur;
  }
  /**
   * Sets whether the blur pass is a kernel blur (if true) or box blur.
   * Only useful in filtered mode (useBlurExponentialShadowMap...)
   */
  set useKernelBlur(e) {
    this._useKernelBlur !== e && (this._useKernelBlur = e, this._disposeBlurPostProcesses());
  }
  /**
   * Gets the depth scale used in ESM mode.
   */
  get depthScale() {
    return this._depthScale !== void 0 ? this._depthScale : this._light.getDepthScale();
  }
  /**
   * Sets the depth scale used in ESM mode.
   * This can override the scale stored on the light.
   */
  set depthScale(e) {
    this._depthScale = e;
  }
  _validateFilter(e) {
    return e;
  }
  /**
   * Gets the current mode of the shadow generator (normal, PCF, ESM...).
   * The returned value is a number equal to one of the available mode defined in ShadowMap.FILTER_x like _FILTER_NONE
   */
  get filter() {
    return this._filter;
  }
  /**
   * Sets the current mode of the shadow generator (normal, PCF, ESM...).
   * The returned value is a number equal to one of the available mode defined in ShadowMap.FILTER_x like _FILTER_NONE
   */
  set filter(e) {
    if (e = this._validateFilter(e), this._light.needCube()) {
      if (e === P.FILTER_BLUREXPONENTIALSHADOWMAP) {
        this.useExponentialShadowMap = !0;
        return;
      } else if (e === P.FILTER_BLURCLOSEEXPONENTIALSHADOWMAP) {
        this.useCloseExponentialShadowMap = !0;
        return;
      } else if (e === P.FILTER_PCF || e === P.FILTER_PCSS) {
        this.usePoissonSampling = !0;
        return;
      }
    }
    if ((e === P.FILTER_PCF || e === P.FILTER_PCSS) && !this._scene.getEngine()._features.supportShadowSamplers) {
      this.usePoissonSampling = !0;
      return;
    }
    this._filter !== e && (this._filter = e, this._disposeBlurPostProcesses(), this._applyFilterValues(), this._light._markMeshesAsLightDirty());
  }
  /**
   * Gets if the current filter is set to Poisson Sampling.
   */
  get usePoissonSampling() {
    return this.filter === P.FILTER_POISSONSAMPLING;
  }
  /**
   * Sets the current filter to Poisson Sampling.
   */
  set usePoissonSampling(e) {
    const t = this._validateFilter(P.FILTER_POISSONSAMPLING);
    !e && this.filter !== P.FILTER_POISSONSAMPLING || (this.filter = e ? t : P.FILTER_NONE);
  }
  /**
   * Gets if the current filter is set to ESM.
   */
  get useExponentialShadowMap() {
    return this.filter === P.FILTER_EXPONENTIALSHADOWMAP;
  }
  /**
   * Sets the current filter is to ESM.
   */
  set useExponentialShadowMap(e) {
    const t = this._validateFilter(P.FILTER_EXPONENTIALSHADOWMAP);
    !e && this.filter !== P.FILTER_EXPONENTIALSHADOWMAP || (this.filter = e ? t : P.FILTER_NONE);
  }
  /**
   * Gets if the current filter is set to filtered ESM.
   */
  get useBlurExponentialShadowMap() {
    return this.filter === P.FILTER_BLUREXPONENTIALSHADOWMAP;
  }
  /**
   * Gets if the current filter is set to filtered  ESM.
   */
  set useBlurExponentialShadowMap(e) {
    const t = this._validateFilter(P.FILTER_BLUREXPONENTIALSHADOWMAP);
    !e && this.filter !== P.FILTER_BLUREXPONENTIALSHADOWMAP || (this.filter = e ? t : P.FILTER_NONE);
  }
  /**
   * Gets if the current filter is set to "close ESM" (using the inverse of the
   * exponential to prevent steep falloff artifacts).
   */
  get useCloseExponentialShadowMap() {
    return this.filter === P.FILTER_CLOSEEXPONENTIALSHADOWMAP;
  }
  /**
   * Sets the current filter to "close ESM" (using the inverse of the
   * exponential to prevent steep falloff artifacts).
   */
  set useCloseExponentialShadowMap(e) {
    const t = this._validateFilter(P.FILTER_CLOSEEXPONENTIALSHADOWMAP);
    !e && this.filter !== P.FILTER_CLOSEEXPONENTIALSHADOWMAP || (this.filter = e ? t : P.FILTER_NONE);
  }
  /**
   * Gets if the current filter is set to filtered "close ESM" (using the inverse of the
   * exponential to prevent steep falloff artifacts).
   */
  get useBlurCloseExponentialShadowMap() {
    return this.filter === P.FILTER_BLURCLOSEEXPONENTIALSHADOWMAP;
  }
  /**
   * Sets the current filter to filtered "close ESM" (using the inverse of the
   * exponential to prevent steep falloff artifacts).
   */
  set useBlurCloseExponentialShadowMap(e) {
    const t = this._validateFilter(P.FILTER_BLURCLOSEEXPONENTIALSHADOWMAP);
    !e && this.filter !== P.FILTER_BLURCLOSEEXPONENTIALSHADOWMAP || (this.filter = e ? t : P.FILTER_NONE);
  }
  /**
   * Gets if the current filter is set to "PCF" (percentage closer filtering).
   */
  get usePercentageCloserFiltering() {
    return this.filter === P.FILTER_PCF;
  }
  /**
   * Sets the current filter to "PCF" (percentage closer filtering).
   */
  set usePercentageCloserFiltering(e) {
    const t = this._validateFilter(P.FILTER_PCF);
    !e && this.filter !== P.FILTER_PCF || (this.filter = e ? t : P.FILTER_NONE);
  }
  /**
   * Gets the PCF or PCSS Quality.
   * Only valid if usePercentageCloserFiltering or usePercentageCloserFiltering is true.
   */
  get filteringQuality() {
    return this._filteringQuality;
  }
  /**
   * Sets the PCF or PCSS Quality.
   * Only valid if usePercentageCloserFiltering or usePercentageCloserFiltering is true.
   */
  set filteringQuality(e) {
    this._filteringQuality !== e && (this._filteringQuality = e, this._disposeBlurPostProcesses(), this._applyFilterValues(), this._light._markMeshesAsLightDirty());
  }
  /**
   * Gets if the current filter is set to "PCSS" (contact hardening).
   */
  get useContactHardeningShadow() {
    return this.filter === P.FILTER_PCSS;
  }
  /**
   * Sets the current filter to "PCSS" (contact hardening).
   */
  set useContactHardeningShadow(e) {
    const t = this._validateFilter(P.FILTER_PCSS);
    !e && this.filter !== P.FILTER_PCSS || (this.filter = e ? t : P.FILTER_NONE);
  }
  /**
   * Gets the Light Size (in shadow map uv unit) used in PCSS to determine the blocker search area and the penumbra size.
   * Using a ratio helps keeping shape stability independently of the map size.
   *
   * It does not account for the light projection as it was having too much
   * instability during the light setup or during light position changes.
   *
   * Only valid if useContactHardeningShadow is true.
   */
  get contactHardeningLightSizeUVRatio() {
    return this._contactHardeningLightSizeUVRatio;
  }
  /**
   * Sets the Light Size (in shadow map uv unit) used in PCSS to determine the blocker search area and the penumbra size.
   * Using a ratio helps keeping shape stability independently of the map size.
   *
   * It does not account for the light projection as it was having too much
   * instability during the light setup or during light position changes.
   *
   * Only valid if useContactHardeningShadow is true.
   */
  set contactHardeningLightSizeUVRatio(e) {
    this._contactHardeningLightSizeUVRatio = e;
  }
  /** Gets or sets the actual darkness of a shadow */
  get darkness() {
    return this._darkness;
  }
  set darkness(e) {
    this.setDarkness(e);
  }
  /**
   * Returns the darkness value (float). This can only decrease the actual darkness of a shadow.
   * 0 means strongest and 1 would means no shadow.
   * @returns the darkness.
   */
  getDarkness() {
    return this._darkness;
  }
  /**
   * Sets the darkness value (float). This can only decrease the actual darkness of a shadow.
   * @param darkness The darkness value 0 means strongest and 1 would means no shadow.
   * @returns the shadow generator allowing fluent coding.
   */
  setDarkness(e) {
    return e >= 1 ? this._darkness = 1 : e <= 0 ? this._darkness = 0 : this._darkness = e, this;
  }
  /** Gets or sets the ability to have transparent shadow  */
  get transparencyShadow() {
    return this._transparencyShadow;
  }
  set transparencyShadow(e) {
    this.setTransparencyShadow(e);
  }
  /**
   * Sets the ability to have transparent shadow (boolean).
   * @param transparent True if transparent else False
   * @returns the shadow generator allowing fluent coding
   */
  setTransparencyShadow(e) {
    return this._transparencyShadow = e, this;
  }
  /**
   * Gets the main RTT containing the shadow map (usually storing depth from the light point of view).
   * @returns The render target texture if present otherwise, null
   */
  getShadowMap() {
    return this._shadowMap;
  }
  /**
   * Gets the RTT used during rendering (can be a blurred version of the shadow map or the shadow map itself).
   * @returns The render target texture if the shadow map is present otherwise, null
   */
  getShadowMapForRendering() {
    return this._shadowMap2 ? this._shadowMap2 : this._shadowMap;
  }
  /**
   * Gets the class name of that object
   * @returns "ShadowGenerator"
   */
  getClassName() {
    return P.CLASSNAME;
  }
  /**
   * Helper function to add a mesh and its descendants to the list of shadow casters.
   * @param mesh Mesh to add
   * @param includeDescendants boolean indicating if the descendants should be added. Default to true
   * @returns the Shadow Generator itself
   */
  addShadowCaster(e, t = !0) {
    if (!this._shadowMap)
      return this;
    if (this._shadowMap.renderList || (this._shadowMap.renderList = []), this._shadowMap.renderList.indexOf(e) === -1 && this._shadowMap.renderList.push(e), t)
      for (const i of e.getChildMeshes())
        this._shadowMap.renderList.indexOf(i) === -1 && this._shadowMap.renderList.push(i);
    return this;
  }
  /**
   * Helper function to remove a mesh and its descendants from the list of shadow casters
   * @param mesh Mesh to remove
   * @param includeDescendants boolean indicating if the descendants should be removed. Default to true
   * @returns the Shadow Generator itself
   */
  removeShadowCaster(e, t = !0) {
    if (!this._shadowMap || !this._shadowMap.renderList)
      return this;
    const i = this._shadowMap.renderList.indexOf(e);
    if (i !== -1 && this._shadowMap.renderList.splice(i, 1), t)
      for (const r of e.getChildren())
        this.removeShadowCaster(r);
    return this;
  }
  /**
   * Returns the associated light object.
   * @returns the light generating the shadow
   */
  getLight() {
    return this._light;
  }
  _getCamera() {
    var e;
    return (e = this._camera) !== null && e !== void 0 ? e : this._scene.activeCamera;
  }
  /**
   * Gets or sets the size of the texture what stores the shadows
   */
  get mapSize() {
    return this._mapSize;
  }
  set mapSize(e) {
    this._mapSize = e, this._light._markMeshesAsLightDirty(), this.recreateShadowMap();
  }
  /**
   * Creates a ShadowGenerator object.
   * A ShadowGenerator is the required tool to use the shadows.
   * Each light casting shadows needs to use its own ShadowGenerator.
   * Documentation : https://doc.babylonjs.com/features/featuresDeepDive/lights/shadows
   * @param mapSize The size of the texture what stores the shadows. Example : 1024.
   * @param light The light object generating the shadows.
   * @param usefullFloatFirst By default the generator will try to use half float textures but if you need precision (for self shadowing for instance), you can use this option to enforce full float texture.
   * @param camera Camera associated with this shadow generator (default: null). If null, takes the scene active camera at the time we need to access it
   */
  constructor(e, t, i, r) {
    this.onBeforeShadowMapRenderObservable = new $(), this.onAfterShadowMapRenderObservable = new $(), this.onBeforeShadowMapRenderMeshObservable = new $(), this.onAfterShadowMapRenderMeshObservable = new $(), this._bias = 5e-5, this._normalBias = 0, this._blurBoxOffset = 1, this._blurScale = 2, this._blurKernel = 1, this._useKernelBlur = !1, this._filter = P.FILTER_NONE, this._filteringQuality = P.QUALITY_HIGH, this._contactHardeningLightSizeUVRatio = 0.1, this._darkness = 0, this._transparencyShadow = !1, this.enableSoftTransparentShadow = !1, this.useOpacityTextureForTransparentShadow = !1, this.frustumEdgeFalloff = 0, this.forceBackFacesOnly = !1, this._lightDirection = g.Zero(), this._viewMatrix = B.Zero(), this._projectionMatrix = B.Zero(), this._transformMatrix = B.Zero(), this._cachedPosition = new g(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE), this._cachedDirection = new g(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE), this._currentFaceIndex = 0, this._currentFaceIndexCache = 0, this._defaultTextureMatrix = B.Identity(), this._mapSize = e, this._light = t, this._scene = t.getScene(), this._camera = r ?? null;
    let s = t._shadowGenerators;
    s || (s = t._shadowGenerators = /* @__PURE__ */ new Map()), s.set(this._camera, this), this.id = t.id, this._useUBO = this._scene.getEngine().supportsUniformBuffers, this._useUBO && (this._sceneUBOs = [], this._sceneUBOs.push(this._scene.createSceneUniformBuffer(`Scene for Shadow Generator (light "${this._light.name}")`))), P._SceneComponentInitialization(this._scene);
    const n = this._scene.getEngine().getCaps();
    i ? n.textureFloatRender && n.textureFloatLinearFiltering ? this._textureType = 1 : n.textureHalfFloatRender && n.textureHalfFloatLinearFiltering ? this._textureType = 2 : this._textureType = 0 : n.textureHalfFloatRender && n.textureHalfFloatLinearFiltering ? this._textureType = 2 : n.textureFloatRender && n.textureFloatLinearFiltering ? this._textureType = 1 : this._textureType = 0, this._initializeGenerator(), this._applyFilterValues();
  }
  _initializeGenerator() {
    this._light._markMeshesAsLightDirty(), this._initializeShadowMap();
  }
  _createTargetRenderTexture() {
    const e = this._scene.getEngine();
    e._features.supportDepthStencilTexture ? (this._shadowMap = new ve(this._light.name + "_shadowMap", this._mapSize, this._scene, !1, !0, this._textureType, this._light.needCube(), void 0, !1, !1), this._shadowMap.createDepthStencilTexture(e.useReverseDepthBuffer ? 516 : 513, !0)) : this._shadowMap = new ve(this._light.name + "_shadowMap", this._mapSize, this._scene, !1, !0, this._textureType, this._light.needCube());
  }
  _initializeShadowMap() {
    if (this._createTargetRenderTexture(), this._shadowMap === null)
      return;
    this._shadowMap.wrapU = I.CLAMP_ADDRESSMODE, this._shadowMap.wrapV = I.CLAMP_ADDRESSMODE, this._shadowMap.anisotropicFilteringLevel = 1, this._shadowMap.updateSamplingMode(I.BILINEAR_SAMPLINGMODE), this._shadowMap.renderParticles = !1, this._shadowMap.ignoreCameraViewport = !0, this._storedUniqueId && (this._shadowMap.uniqueId = this._storedUniqueId), this._shadowMap.customRenderFunction = this._renderForShadowMap.bind(this), this._shadowMap.customIsReadyFunction = () => !0;
    const e = this._scene.getEngine();
    this._shadowMap.onBeforeBindObservable.add(() => {
      var r;
      this._currentSceneUBO = this._scene.getSceneUniformBuffer(), (r = e._debugPushGroup) === null || r === void 0 || r.call(e, `shadow map generation for pass id ${e.currentRenderPassId}`, 1);
    }), this._shadowMap.onBeforeRenderObservable.add((r) => {
      this._sceneUBOs && this._scene.setSceneUniformBuffer(this._sceneUBOs[0]), this._currentFaceIndex = r, this._filter === P.FILTER_PCF && e.setColorWrite(!1), this.getTransformMatrix(), this._scene.setTransformMatrix(this._viewMatrix, this._projectionMatrix), this._useUBO && (this._scene.getSceneUniformBuffer().unbindEffect(), this._scene.finalizeSceneUbo());
    }), this._shadowMap.onAfterUnbindObservable.add(() => {
      var r, s;
      if (this._sceneUBOs && this._scene.setSceneUniformBuffer(this._currentSceneUBO), this._scene.updateTransformMatrix(), this._filter === P.FILTER_PCF && e.setColorWrite(!0), !this.useBlurExponentialShadowMap && !this.useBlurCloseExponentialShadowMap) {
        (r = e._debugPopGroup) === null || r === void 0 || r.call(e, 1);
        return;
      }
      const n = this.getShadowMapForRendering();
      n && (this._scene.postProcessManager.directRender(this._blurPostProcesses, n.renderTarget, !0), e.unBindFramebuffer(n.renderTarget, !0), (s = e._debugPopGroup) === null || s === void 0 || s.call(e, 1));
    });
    const t = new Et(0, 0, 0, 0), i = new Et(1, 1, 1, 1);
    this._shadowMap.onClearObservable.add((r) => {
      this._filter === P.FILTER_PCF ? r.clear(i, !1, !0, !1) : this.useExponentialShadowMap || this.useBlurExponentialShadowMap ? r.clear(t, !0, !0, !1) : r.clear(i, !0, !0, !1);
    }), this._shadowMap.onResizeObservable.add((r) => {
      this._storedUniqueId = this._shadowMap.uniqueId, this._mapSize = r.getRenderSize(), this._light._markMeshesAsLightDirty(), this.recreateShadowMap();
    });
    for (let r = ai.MIN_RENDERINGGROUPS; r < ai.MAX_RENDERINGGROUPS; r++)
      this._shadowMap.setRenderingAutoClearDepthStencil(r, !1);
  }
  _initializeBlurRTTAndPostProcesses() {
    const e = this._scene.getEngine(), t = this._mapSize / this.blurScale;
    (!this.useKernelBlur || this.blurScale !== 1) && (this._shadowMap2 = new ve(this._light.name + "_shadowMap2", t, this._scene, !1, !0, this._textureType, void 0, void 0, !1), this._shadowMap2.wrapU = I.CLAMP_ADDRESSMODE, this._shadowMap2.wrapV = I.CLAMP_ADDRESSMODE, this._shadowMap2.updateSamplingMode(I.BILINEAR_SAMPLINGMODE)), this.useKernelBlur ? (this._kernelBlurXPostprocess = new je(this._light.name + "KernelBlurX", new _t(1, 0), this.blurKernel, 1, null, I.BILINEAR_SAMPLINGMODE, e, !1, this._textureType), this._kernelBlurXPostprocess.width = t, this._kernelBlurXPostprocess.height = t, this._kernelBlurXPostprocess.externalTextureSamplerBinding = !0, this._kernelBlurXPostprocess.onApplyObservable.add((i) => {
      i.setTexture("textureSampler", this._shadowMap);
    }), this._kernelBlurYPostprocess = new je(this._light.name + "KernelBlurY", new _t(0, 1), this.blurKernel, 1, null, I.BILINEAR_SAMPLINGMODE, e, !1, this._textureType), this._kernelBlurXPostprocess.autoClear = !1, this._kernelBlurYPostprocess.autoClear = !1, this._textureType === 0 && (this._kernelBlurXPostprocess.packedFloat = !0, this._kernelBlurYPostprocess.packedFloat = !0), this._blurPostProcesses = [this._kernelBlurXPostprocess, this._kernelBlurYPostprocess]) : (this._boxBlurPostprocess = new W(this._light.name + "DepthBoxBlur", "depthBoxBlur", ["screenSize", "boxOffset"], [], 1, null, I.BILINEAR_SAMPLINGMODE, e, !1, "#define OFFSET " + this._blurBoxOffset, this._textureType), this._boxBlurPostprocess.externalTextureSamplerBinding = !0, this._boxBlurPostprocess.onApplyObservable.add((i) => {
      i.setFloat2("screenSize", t, t), i.setTexture("textureSampler", this._shadowMap);
    }), this._boxBlurPostprocess.autoClear = !1, this._blurPostProcesses = [this._boxBlurPostprocess]);
  }
  _renderForShadowMap(e, t, i, r) {
    let s;
    if (r.length)
      for (s = 0; s < r.length; s++)
        this._renderSubMeshForShadowMap(r.data[s]);
    for (s = 0; s < e.length; s++)
      this._renderSubMeshForShadowMap(e.data[s]);
    for (s = 0; s < t.length; s++)
      this._renderSubMeshForShadowMap(t.data[s]);
    if (this._transparencyShadow)
      for (s = 0; s < i.length; s++)
        this._renderSubMeshForShadowMap(i.data[s], !0);
    else
      for (s = 0; s < i.length; s++)
        i.data[s].getEffectiveMesh()._internalAbstractMeshDataInfo._isActiveIntermediate = !1;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _bindCustomEffectForRenderSubMeshForShadowMap(e, t, i) {
    t.setMatrix("viewProjection", this.getTransformMatrix());
  }
  _renderSubMeshForShadowMap(e, t = !1) {
    var i, r;
    const s = e.getRenderingMesh(), n = e.getEffectiveMesh(), o = this._scene, a = o.getEngine(), f = e.getMaterial();
    if (n._internalAbstractMeshDataInfo._isActiveIntermediate = !1, !f || e.verticesCount === 0 || e._renderId === o.getRenderId())
      return;
    const c = n._getWorldMatrixDeterminant() < 0;
    let d = (i = s.overrideMaterialSideOrientation) !== null && i !== void 0 ? i : f.sideOrientation;
    c && (d = d === 0 ? 1 : 0);
    const E = d === 0;
    a.setState(f.backFaceCulling, void 0, void 0, E, f.cullBackFaces);
    const u = s._getInstancesRenderList(e._id, !!e.getReplacementMesh());
    if (u.mustReturn)
      return;
    const _ = a.getCaps().instancedArrays && (u.visibleInstances[e._id] !== null && u.visibleInstances[e._id] !== void 0 || s.hasThinInstances);
    if (!(this.customAllowRendering && !this.customAllowRendering(e)))
      if (this.isReady(e, _, t)) {
        e._renderId = o.getRenderId();
        const p = f.shadowDepthWrapper, A = (r = p == null ? void 0 : p.getEffect(e, this, a.currentRenderPassId)) !== null && r !== void 0 ? r : e._getDrawWrapper(), R = li.GetEffect(A);
        a.enableEffect(A), _ || s._bind(e, R, f.fillMode), this.getTransformMatrix(), R.setFloat3("biasAndScaleSM", this.bias, this.normalBias, this.depthScale), this.getLight().getTypeID() === V.LIGHTTYPEID_DIRECTIONALLIGHT ? R.setVector3("lightDataSM", this._cachedDirection) : R.setVector3("lightDataSM", this._cachedPosition);
        const N = this._getCamera();
        if (N && R.setFloat2("depthValuesSM", this.getLight().getDepthMinZ(N), this.getLight().getDepthMinZ(N) + this.getLight().getDepthMaxZ(N)), t && this.enableSoftTransparentShadow && R.setFloat("softTransparentShadowSM", n.visibility * f.alpha), p)
          e._setMainDrawWrapperOverride(A), p.standalone ? p.baseMaterial.bindForSubMesh(n.getWorldMatrix(), s, e) : f.bindForSubMesh(n.getWorldMatrix(), s, e), e._setMainDrawWrapperOverride(null);
        else {
          if (this._opacityTexture && (R.setTexture("diffuseSampler", this._opacityTexture), R.setMatrix("diffuseMatrix", this._opacityTexture.getTextureMatrix() || this._defaultTextureMatrix)), s.useBones && s.computeBonesUsingShaders && s.skeleton) {
            const L = s.skeleton;
            if (L.isUsingTextureForMatrices) {
              const U = L.getTransformMatrixTexture(s);
              if (!U)
                return;
              R.setTexture("boneSampler", U), R.setFloat("boneTextureWidth", 4 * (L.bones.length + 1));
            } else
              R.setMatrices("mBones", L.getTransformMatrices(s));
          }
          M.BindMorphTargetParameters(s, R), s.morphTargetManager && s.morphTargetManager.isUsingTextureForTargets && s.morphTargetManager._bind(R), Nt(R, f, o);
        }
        !this._useUBO && !p && this._bindCustomEffectForRenderSubMeshForShadowMap(e, R, n), M.BindSceneUniformBuffer(R, this._scene.getSceneUniformBuffer()), this._scene.getSceneUniformBuffer().bindUniformBuffer();
        const O = n.getWorldMatrix();
        _ && (n.getMeshUniformBuffer().bindToEffect(R, "Mesh"), n.transferToEffect(O)), this.forceBackFacesOnly && a.setState(!0, 0, !1, !0, f.cullBackFaces), this.onBeforeShadowMapRenderMeshObservable.notifyObservers(s), this.onBeforeShadowMapRenderObservable.notifyObservers(R), s._processRendering(n, e, R, f.fillMode, u, _, (L, U) => {
          n !== s && !L ? (s.getMeshUniformBuffer().bindToEffect(R, "Mesh"), s.transferToEffect(U)) : (n.getMeshUniformBuffer().bindToEffect(R, "Mesh"), n.transferToEffect(L ? U : O));
        }), this.forceBackFacesOnly && a.setState(!0, 0, !1, !1, f.cullBackFaces), this.onAfterShadowMapRenderObservable.notifyObservers(R), this.onAfterShadowMapRenderMeshObservable.notifyObservers(s);
      } else
        this._shadowMap && this._shadowMap.resetRefreshCounter();
  }
  _applyFilterValues() {
    this._shadowMap && (this.filter === P.FILTER_NONE || this.filter === P.FILTER_PCSS ? this._shadowMap.updateSamplingMode(I.NEAREST_SAMPLINGMODE) : this._shadowMap.updateSamplingMode(I.BILINEAR_SAMPLINGMODE));
  }
  /**
   * Forces all the attached effect to compile to enable rendering only once ready vs. lazily compiling effects.
   * @param onCompiled Callback triggered at the and of the effects compilation
   * @param options Sets of optional options forcing the compilation with different modes
   */
  forceCompilation(e, t) {
    const i = {
      useInstances: !1,
      ...t
    }, r = this.getShadowMap();
    if (!r) {
      e && e(this);
      return;
    }
    const s = r.renderList;
    if (!s) {
      e && e(this);
      return;
    }
    const n = new Array();
    for (const f of s)
      n.push(...f.subMeshes);
    if (n.length === 0) {
      e && e(this);
      return;
    }
    let o = 0;
    const a = () => {
      var f, c;
      if (!(!this._scene || !this._scene.getEngine())) {
        for (; this.isReady(n[o], i.useInstances, (c = (f = n[o].getMaterial()) === null || f === void 0 ? void 0 : f.needAlphaBlendingForMesh(n[o].getMesh())) !== null && c !== void 0 ? c : !1); )
          if (o++, o >= n.length) {
            e && e(this);
            return;
          }
        setTimeout(a, 16);
      }
    };
    a();
  }
  /**
   * Forces all the attached effect to compile to enable rendering only once ready vs. lazily compiling effects.
   * @param options Sets of optional options forcing the compilation with different modes
   * @returns A promise that resolves when the compilation completes
   */
  forceCompilationAsync(e) {
    return new Promise((t) => {
      this.forceCompilation(() => {
        t();
      }, e);
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _isReadyCustomDefines(e, t, i) {
  }
  _prepareShadowDefines(e, t, i, r) {
    i.push("#define SM_LIGHTTYPE_" + this._light.getClassName().toUpperCase()), i.push("#define SM_FLOAT " + (this._textureType !== 0 ? "1" : "0")), i.push("#define SM_ESM " + (this.useExponentialShadowMap || this.useBlurExponentialShadowMap ? "1" : "0")), i.push("#define SM_DEPTHTEXTURE " + (this.usePercentageCloserFiltering || this.useContactHardeningShadow ? "1" : "0"));
    const s = e.getMesh();
    return i.push("#define SM_NORMALBIAS " + (this.normalBias && s.isVerticesDataPresent(k.NormalKind) ? "1" : "0")), i.push("#define SM_DIRECTIONINLIGHTDATA " + (this.getLight().getTypeID() === V.LIGHTTYPEID_DIRECTIONALLIGHT ? "1" : "0")), i.push("#define SM_USEDISTANCE " + (this._light.needCube() ? "1" : "0")), i.push("#define SM_SOFTTRANSPARENTSHADOW " + (this.enableSoftTransparentShadow && r ? "1" : "0")), this._isReadyCustomDefines(i, e, t), i;
  }
  /**
   * Determine whether the shadow generator is ready or not (mainly all effects and related post processes needs to be ready).
   * @param subMesh The submesh we want to render in the shadow map
   * @param useInstances Defines whether will draw in the map using instances
   * @param isTransparent Indicates that isReady is called for a transparent subMesh
   * @returns true if ready otherwise, false
   */
  isReady(e, t, i) {
    var r;
    const s = e.getMaterial(), n = s == null ? void 0 : s.shadowDepthWrapper;
    if (this._opacityTexture = null, !s)
      return !1;
    const o = [];
    if (this._prepareShadowDefines(e, t, o, i), n) {
      if (!n.isReadyForSubMesh(e, o, this, t, this._scene.getEngine().currentRenderPassId))
        return !1;
    } else {
      const a = e._getDrawWrapper(void 0, !0);
      let f = a.effect, c = a.defines;
      const d = [k.PositionKind], E = e.getMesh();
      this.normalBias && E.isVerticesDataPresent(k.NormalKind) && (d.push(k.NormalKind), o.push("#define NORMAL"), E.nonUniformScaling && o.push("#define NONUNIFORMSCALING"));
      const u = s.needAlphaTesting();
      if ((u || s.needAlphaBlending()) && (this.useOpacityTextureForTransparentShadow ? this._opacityTexture = s.opacityTexture : this._opacityTexture = s.getAlphaTestTexture(), this._opacityTexture)) {
        if (!this._opacityTexture.isReady())
          return !1;
        const N = (r = s.alphaCutOff) !== null && r !== void 0 ? r : P.DEFAULT_ALPHA_CUTOFF;
        o.push("#define ALPHATEXTURE"), u && o.push(`#define ALPHATESTVALUE ${N}${N % 1 === 0 ? "." : ""}`), E.isVerticesDataPresent(k.UVKind) && (d.push(k.UVKind), o.push("#define UV1")), E.isVerticesDataPresent(k.UV2Kind) && this._opacityTexture.coordinatesIndex === 1 && (d.push(k.UV2Kind), o.push("#define UV2"));
      }
      const _ = new Ht();
      if (E.useBones && E.computeBonesUsingShaders && E.skeleton) {
        d.push(k.MatricesIndicesKind), d.push(k.MatricesWeightsKind), E.numBoneInfluencers > 4 && (d.push(k.MatricesIndicesExtraKind), d.push(k.MatricesWeightsExtraKind));
        const N = E.skeleton;
        o.push("#define NUM_BONE_INFLUENCERS " + E.numBoneInfluencers), E.numBoneInfluencers > 0 && _.addCPUSkinningFallback(0, E), N.isUsingTextureForMatrices ? o.push("#define BONETEXTURE") : o.push("#define BonesPerMesh " + (N.bones.length + 1));
      } else
        o.push("#define NUM_BONE_INFLUENCERS 0");
      const p = E.morphTargetManager;
      let A = 0;
      if (p && p.numInfluencers > 0 && (o.push("#define MORPHTARGETS"), A = p.numInfluencers, o.push("#define NUM_MORPH_INFLUENCERS " + A), p.isUsingTextureForTargets && o.push("#define MORPHTARGETS_TEXTURE"), M.PrepareAttributesForMorphTargetsInfluencers(d, E, A)), Pi(s, this._scene, o), t && (o.push("#define INSTANCES"), M.PushAttributesForInstances(d), e.getRenderingMesh().hasThinInstances && o.push("#define THIN_INSTANCES")), this.customShaderOptions && this.customShaderOptions.defines)
        for (const N of this.customShaderOptions.defines)
          o.indexOf(N) === -1 && o.push(N);
      const R = o.join(`
`);
      if (c !== R) {
        c = R;
        let N = "shadowMap";
        const O = [
          "world",
          "mBones",
          "viewProjection",
          "diffuseMatrix",
          "lightDataSM",
          "depthValuesSM",
          "biasAndScaleSM",
          "morphTargetInfluences",
          "boneTextureWidth",
          "softTransparentShadowSM",
          "morphTargetTextureInfo",
          "morphTargetTextureIndices"
        ], L = ["diffuseSampler", "boneSampler", "morphTargets"], U = ["Scene", "Mesh"];
        if (Ot(O), this.customShaderOptions) {
          if (N = this.customShaderOptions.shaderName, this.customShaderOptions.attributes)
            for (const D of this.customShaderOptions.attributes)
              d.indexOf(D) === -1 && d.push(D);
          if (this.customShaderOptions.uniforms)
            for (const D of this.customShaderOptions.uniforms)
              O.indexOf(D) === -1 && O.push(D);
          if (this.customShaderOptions.samplers)
            for (const D of this.customShaderOptions.samplers)
              L.indexOf(D) === -1 && L.push(D);
        }
        const y = this._scene.getEngine();
        f = y.createEffect(N, {
          attributes: d,
          uniformsNames: O,
          uniformBuffersNames: U,
          samplers: L,
          defines: R,
          fallbacks: _,
          onCompiled: null,
          onError: null,
          indexParameters: { maxSimultaneousMorphTargets: A }
        }, y), a.setEffect(f, c);
      }
      if (!f.isReady())
        return !1;
    }
    return (this.useBlurExponentialShadowMap || this.useBlurCloseExponentialShadowMap) && (!this._blurPostProcesses || !this._blurPostProcesses.length) && this._initializeBlurRTTAndPostProcesses(), !(this._kernelBlurXPostprocess && !this._kernelBlurXPostprocess.isReady() || this._kernelBlurYPostprocess && !this._kernelBlurYPostprocess.isReady() || this._boxBlurPostprocess && !this._boxBlurPostprocess.isReady());
  }
  /**
   * Prepare all the defines in a material relying on a shadow map at the specified light index.
   * @param defines Defines of the material we want to update
   * @param lightIndex Index of the light in the enabled light list of the material
   */
  prepareDefines(e, t) {
    const i = this._scene, r = this._light;
    !i.shadowsEnabled || !r.shadowEnabled || (e["SHADOW" + t] = !0, this.useContactHardeningShadow ? (e["SHADOWPCSS" + t] = !0, this._filteringQuality === P.QUALITY_LOW ? e["SHADOWLOWQUALITY" + t] = !0 : this._filteringQuality === P.QUALITY_MEDIUM && (e["SHADOWMEDIUMQUALITY" + t] = !0)) : this.usePercentageCloserFiltering ? (e["SHADOWPCF" + t] = !0, this._filteringQuality === P.QUALITY_LOW ? e["SHADOWLOWQUALITY" + t] = !0 : this._filteringQuality === P.QUALITY_MEDIUM && (e["SHADOWMEDIUMQUALITY" + t] = !0)) : this.usePoissonSampling ? e["SHADOWPOISSON" + t] = !0 : this.useExponentialShadowMap || this.useBlurExponentialShadowMap ? e["SHADOWESM" + t] = !0 : (this.useCloseExponentialShadowMap || this.useBlurCloseExponentialShadowMap) && (e["SHADOWCLOSEESM" + t] = !0), r.needCube() && (e["SHADOWCUBE" + t] = !0));
  }
  /**
   * Binds the shadow related information inside of an effect (information like near, far, darkness...
   * defined in the generator but impacting the effect).
   * @param lightIndex Index of the light in the enabled light list of the material owning the effect
   * @param effect The effect we are binding the information for
   */
  bindShadowLight(e, t) {
    const i = this._light;
    if (!this._scene.shadowsEnabled || !i.shadowEnabled)
      return;
    const s = this._getCamera();
    if (!s)
      return;
    const n = this.getShadowMap();
    n && (i.needCube() || t.setMatrix("lightMatrix" + e, this.getTransformMatrix()), this._filter === P.FILTER_PCF ? (t.setDepthStencilTexture("shadowSampler" + e, this.getShadowMapForRendering()), i._uniformBuffer.updateFloat4("shadowsInfo", this.getDarkness(), n.getSize().width, 1 / n.getSize().width, this.frustumEdgeFalloff, e)) : this._filter === P.FILTER_PCSS ? (t.setDepthStencilTexture("shadowSampler" + e, this.getShadowMapForRendering()), t.setTexture("depthSampler" + e, this.getShadowMapForRendering()), i._uniformBuffer.updateFloat4("shadowsInfo", this.getDarkness(), 1 / n.getSize().width, this._contactHardeningLightSizeUVRatio * n.getSize().width, this.frustumEdgeFalloff, e)) : (t.setTexture("shadowSampler" + e, this.getShadowMapForRendering()), i._uniformBuffer.updateFloat4("shadowsInfo", this.getDarkness(), this.blurScale / n.getSize().width, this.depthScale, this.frustumEdgeFalloff, e)), i._uniformBuffer.updateFloat2("depthValues", this.getLight().getDepthMinZ(s), this.getLight().getDepthMinZ(s) + this.getLight().getDepthMaxZ(s), e));
  }
  /**
   * Gets the transformation matrix used to project the meshes into the map from the light point of view.
   * (eq to shadow projection matrix * light transform matrix)
   * @returns The transform matrix used to create the shadow map
   */
  getTransformMatrix() {
    const e = this._scene;
    if (this._currentRenderId === e.getRenderId() && this._currentFaceIndexCache === this._currentFaceIndex)
      return this._transformMatrix;
    this._currentRenderId = e.getRenderId(), this._currentFaceIndexCache = this._currentFaceIndex;
    let t = this._light.position;
    if (this._light.computeTransformedInformation() && (t = this._light.transformedPosition), g.NormalizeToRef(this._light.getShadowDirection(this._currentFaceIndex), this._lightDirection), Math.abs(g.Dot(this._lightDirection, g.Up())) === 1 && (this._lightDirection.z = 1e-13), this._light.needProjectionMatrixCompute() || !this._cachedPosition || !this._cachedDirection || !t.equals(this._cachedPosition) || !this._lightDirection.equals(this._cachedDirection)) {
      this._cachedPosition.copyFrom(t), this._cachedDirection.copyFrom(this._lightDirection), B.LookAtLHToRef(t, t.add(this._lightDirection), g.Up(), this._viewMatrix);
      const i = this.getShadowMap();
      if (i) {
        const r = i.renderList;
        r && this._light.setShadowProjectionMatrix(this._projectionMatrix, this._viewMatrix, r);
      }
      this._viewMatrix.multiplyToRef(this._projectionMatrix, this._transformMatrix);
    }
    return this._transformMatrix;
  }
  /**
   * Recreates the shadow map dependencies like RTT and post processes. This can be used during the switch between
   * Cube and 2D textures for instance.
   */
  recreateShadowMap() {
    const e = this._shadowMap;
    if (!e)
      return;
    const t = e.renderList;
    if (this._disposeRTTandPostProcesses(), this._initializeGenerator(), this.filter = this._filter, this._applyFilterValues(), t) {
      this._shadowMap.renderList || (this._shadowMap.renderList = []);
      for (const i of t)
        this._shadowMap.renderList.push(i);
    } else
      this._shadowMap.renderList = null;
  }
  _disposeBlurPostProcesses() {
    this._shadowMap2 && (this._shadowMap2.dispose(), this._shadowMap2 = null), this._boxBlurPostprocess && (this._boxBlurPostprocess.dispose(), this._boxBlurPostprocess = null), this._kernelBlurXPostprocess && (this._kernelBlurXPostprocess.dispose(), this._kernelBlurXPostprocess = null), this._kernelBlurYPostprocess && (this._kernelBlurYPostprocess.dispose(), this._kernelBlurYPostprocess = null), this._blurPostProcesses = [];
  }
  _disposeRTTandPostProcesses() {
    this._shadowMap && (this._shadowMap.dispose(), this._shadowMap = null), this._disposeBlurPostProcesses();
  }
  _disposeSceneUBOs() {
    if (this._sceneUBOs) {
      for (const e of this._sceneUBOs)
        e.dispose();
      this._sceneUBOs = [];
    }
  }
  /**
   * Disposes the ShadowGenerator.
   * Returns nothing.
   */
  dispose() {
    if (this._disposeRTTandPostProcesses(), this._disposeSceneUBOs(), this._light) {
      if (this._light._shadowGenerators) {
        const e = this._light._shadowGenerators.entries();
        for (let t = e.next(); t.done !== !0; t = e.next()) {
          const [i, r] = t.value;
          r === this && this._light._shadowGenerators.delete(i);
        }
        this._light._shadowGenerators.size === 0 && (this._light._shadowGenerators = null);
      }
      this._light._markMeshesAsLightDirty();
    }
    this.onBeforeShadowMapRenderMeshObservable.clear(), this.onBeforeShadowMapRenderObservable.clear(), this.onAfterShadowMapRenderMeshObservable.clear(), this.onAfterShadowMapRenderObservable.clear();
  }
  /**
   * Serializes the shadow generator setup to a json object.
   * @returns The serialized JSON object
   */
  serialize() {
    var e;
    const t = {}, i = this.getShadowMap();
    if (!i)
      return t;
    if (t.className = this.getClassName(), t.lightId = this._light.id, t.cameraId = (e = this._camera) === null || e === void 0 ? void 0 : e.id, t.id = this.id, t.mapSize = i.getRenderSize(), t.forceBackFacesOnly = this.forceBackFacesOnly, t.darkness = this.getDarkness(), t.transparencyShadow = this._transparencyShadow, t.frustumEdgeFalloff = this.frustumEdgeFalloff, t.bias = this.bias, t.normalBias = this.normalBias, t.usePercentageCloserFiltering = this.usePercentageCloserFiltering, t.useContactHardeningShadow = this.useContactHardeningShadow, t.contactHardeningLightSizeUVRatio = this.contactHardeningLightSizeUVRatio, t.filteringQuality = this.filteringQuality, t.useExponentialShadowMap = this.useExponentialShadowMap, t.useBlurExponentialShadowMap = this.useBlurExponentialShadowMap, t.useCloseExponentialShadowMap = this.useBlurExponentialShadowMap, t.useBlurCloseExponentialShadowMap = this.useBlurExponentialShadowMap, t.usePoissonSampling = this.usePoissonSampling, t.depthScale = this.depthScale, t.blurBoxOffset = this.blurBoxOffset, t.blurKernel = this.blurKernel, t.blurScale = this.blurScale, t.useKernelBlur = this.useKernelBlur, t.renderList = [], i.renderList)
      for (let r = 0; r < i.renderList.length; r++) {
        const s = i.renderList[r];
        t.renderList.push(s.id);
      }
    return t;
  }
  /**
   * Parses a serialized ShadowGenerator and returns a new ShadowGenerator.
   * @param parsedShadowGenerator The JSON object to parse
   * @param scene The scene to create the shadow map for
   * @param constr A function that builds a shadow generator or undefined to create an instance of the default shadow generator
   * @returns The parsed shadow generator
   */
  static Parse(e, t, i) {
    const r = t.getLightById(e.lightId), s = e.cameraId !== void 0 ? t.getCameraById(e.cameraId) : null, n = i ? i(e.mapSize, r, s) : new P(e.mapSize, r, void 0, s), o = n.getShadowMap();
    for (let a = 0; a < e.renderList.length; a++)
      t.getMeshesById(e.renderList[a]).forEach(function(c) {
        o && (o.renderList || (o.renderList = []), o.renderList.push(c));
      });
    return e.id !== void 0 && (n.id = e.id), n.forceBackFacesOnly = !!e.forceBackFacesOnly, e.darkness !== void 0 && n.setDarkness(e.darkness), e.transparencyShadow && n.setTransparencyShadow(!0), e.frustumEdgeFalloff !== void 0 && (n.frustumEdgeFalloff = e.frustumEdgeFalloff), e.bias !== void 0 && (n.bias = e.bias), e.normalBias !== void 0 && (n.normalBias = e.normalBias), e.usePercentageCloserFiltering ? n.usePercentageCloserFiltering = !0 : e.useContactHardeningShadow ? n.useContactHardeningShadow = !0 : e.usePoissonSampling ? n.usePoissonSampling = !0 : e.useExponentialShadowMap ? n.useExponentialShadowMap = !0 : e.useBlurExponentialShadowMap ? n.useBlurExponentialShadowMap = !0 : e.useCloseExponentialShadowMap ? n.useCloseExponentialShadowMap = !0 : e.useBlurCloseExponentialShadowMap ? n.useBlurCloseExponentialShadowMap = !0 : e.useVarianceShadowMap ? n.useExponentialShadowMap = !0 : e.useBlurVarianceShadowMap && (n.useBlurExponentialShadowMap = !0), e.contactHardeningLightSizeUVRatio !== void 0 && (n.contactHardeningLightSizeUVRatio = e.contactHardeningLightSizeUVRatio), e.filteringQuality !== void 0 && (n.filteringQuality = e.filteringQuality), e.depthScale && (n.depthScale = e.depthScale), e.blurScale && (n.blurScale = e.blurScale), e.blurBoxOffset && (n.blurBoxOffset = e.blurBoxOffset), e.useKernelBlur && (n.useKernelBlur = e.useKernelBlur), e.blurKernel && (n.blurKernel = e.blurKernel), n;
  }
}
P.CLASSNAME = "ShadowGenerator";
P.FILTER_NONE = 0;
P.FILTER_EXPONENTIALSHADOWMAP = 1;
P.FILTER_POISSONSAMPLING = 2;
P.FILTER_BLUREXPONENTIALSHADOWMAP = 3;
P.FILTER_CLOSEEXPONENTIALSHADOWMAP = 4;
P.FILTER_BLURCLOSEEXPONENTIALSHADOWMAP = 5;
P.FILTER_PCF = 6;
P.FILTER_PCSS = 7;
P.QUALITY_HIGH = 0;
P.QUALITY_MEDIUM = 1;
P.QUALITY_LOW = 2;
P.DEFAULT_ALPHA_CUTOFF = 0.5;
P._SceneComponentInitialization = (l) => {
  throw pt("ShadowGeneratorSceneComponent");
};
const Gs = "depthPixelShader", Xs = `#ifdef ALPHATEST
varying vec2 vUV;
uniform sampler2D diffuseSampler;
#endif
#include<clipPlaneFragmentDeclaration>
varying float vDepthMetric;
#ifdef PACKED
#include<packingFunctions>
#endif
#ifdef STORE_CAMERASPACE_Z
varying vec4 vViewPos;
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{
#include<clipPlaneFragment>
#ifdef ALPHATEST
if (texture2D(diffuseSampler,vUV).a<0.4)
discard;
#endif
#ifdef STORE_CAMERASPACE_Z
#ifdef PACKED
gl_FragColor=pack(vViewPos.z);
#else
gl_FragColor=vec4(vViewPos.z,0.0,0.0,1.0);
#endif
#else
#ifdef NONLINEARDEPTH
#ifdef PACKED
gl_FragColor=pack(gl_FragCoord.z);
#else
gl_FragColor=vec4(gl_FragCoord.z,0.0,0.0,0.0);
#endif
#else
#ifdef PACKED
gl_FragColor=pack(vDepthMetric);
#else
gl_FragColor=vec4(vDepthMetric,0.0,0.0,1.0);
#endif
#endif
#endif
}`;
C.ShadersStore[Gs] = Xs;
const Hs = "instancesDeclaration", ks = `#ifdef INSTANCES
attribute vec4 world0;
attribute vec4 world1;
attribute vec4 world2;
attribute vec4 world3;
#ifdef INSTANCESCOLOR
attribute vec4 instanceColor;
#endif
#if defined(THIN_INSTANCES) && !defined(WORLD_UBO)
uniform mat4 world;
#endif
#if defined(VELOCITY) || defined(PREPASS_VELOCITY)
attribute vec4 previousWorld0;
attribute vec4 previousWorld1;
attribute vec4 previousWorld2;
attribute vec4 previousWorld3;
#ifdef THIN_INSTANCES
uniform mat4 previousWorld;
#endif
#endif
#else
#if !defined(WORLD_UBO)
uniform mat4 world;
#endif
#if defined(VELOCITY) || defined(PREPASS_VELOCITY)
uniform mat4 previousWorld;
#endif
#endif
`;
C.IncludesShadersStore[Hs] = ks;
const zs = "depthVertexShader", Ws = `attribute vec3 position;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<clipPlaneVertexDeclaration>
#include<instancesDeclaration>
uniform mat4 viewProjection;
uniform vec2 depthValues;
#if defined(ALPHATEST) || defined(NEED_UV)
varying vec2 vUV;
uniform mat4 diffuseMatrix;
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#endif
#ifdef STORE_CAMERASPACE_Z
uniform mat4 view;
varying vec4 vViewPos;
#endif
varying float vDepthMetric;
#define CUSTOM_VERTEX_DEFINITIONS
void main(void)
{
vec3 positionUpdated=position;
#ifdef UV1
vec2 uvUpdated=uv;
#endif
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(positionUpdated,1.0);
#include<clipPlaneVertex>
gl_Position=viewProjection*worldPos;
#ifdef STORE_CAMERASPACE_Z
vViewPos=view*worldPos;
#else
#ifdef USE_REVERSE_DEPTHBUFFER
vDepthMetric=((-gl_Position.z+depthValues.x)/(depthValues.y));
#else
vDepthMetric=((gl_Position.z+depthValues.x)/(depthValues.y));
#endif
#endif
#if defined(ALPHATEST) || defined(BASIC_RENDER)
#ifdef UV1
vUV=vec2(diffuseMatrix*vec4(uvUpdated,1.0,0.0));
#endif
#ifdef UV2
vUV=vec2(diffuseMatrix*vec4(uv2,1.0,0.0));
#endif
#endif
}
`;
C.ShadersStore[zs] = Ws;
class kt {
  /**
   * Sets a specific material to be used to render a mesh/a list of meshes by the depth renderer
   * @param mesh mesh or array of meshes
   * @param material material to use by the depth render when rendering the mesh(es). If undefined is passed, the specific material created by the depth renderer will be used.
   */
  setMaterialForRendering(e, t) {
    this._depthMap.setMaterialForRendering(e, t);
  }
  /**
   * Instantiates a depth renderer
   * @param scene The scene the renderer belongs to
   * @param type The texture type of the depth map (default: Engine.TEXTURETYPE_FLOAT)
   * @param camera The camera to be used to render the depth map (default: scene's active camera)
   * @param storeNonLinearDepth Defines whether the depth is stored linearly like in Babylon Shadows or directly like glFragCoord.z
   * @param samplingMode The sampling mode to be used with the render target (Linear, Nearest...) (default: TRILINEAR_SAMPLINGMODE)
   * @param storeCameraSpaceZ Defines whether the depth stored is the Z coordinate in camera space. If true, storeNonLinearDepth has no effect. (Default: false)
   * @param name Name of the render target (default: DepthRenderer)
   */
  constructor(e, t = 1, i = null, r = !1, s = I.TRILINEAR_SAMPLINGMODE, n = !1, o) {
    this.enabled = !0, this.forceDepthWriteTransparentMeshes = !1, this.useOnlyInActiveCamera = !1, this.reverseCulling = !1, this._scene = e, this._storeNonLinearDepth = r, this._storeCameraSpaceZ = n, this.isPacked = t === 0, this.isPacked ? this.clearColor = new Et(1, 1, 1, 1) : this.clearColor = new Et(n ? 1e8 : 1, 0, 0, 1), kt._SceneComponentInitialization(this._scene);
    const a = e.getEngine();
    this._camera = i, s !== I.NEAREST_SAMPLINGMODE && (t === 1 && !a._caps.textureFloatLinearFiltering && (s = I.NEAREST_SAMPLINGMODE), t === 2 && !a._caps.textureHalfFloatLinearFiltering && (s = I.NEAREST_SAMPLINGMODE));
    const f = this.isPacked || !a._features.supportExtendedTextureFormats ? 5 : 6;
    this._depthMap = new ve(o ?? "DepthRenderer", { width: a.getRenderWidth(), height: a.getRenderHeight() }, this._scene, !1, !0, t, !1, s, void 0, void 0, void 0, f), this._depthMap.wrapU = I.CLAMP_ADDRESSMODE, this._depthMap.wrapV = I.CLAMP_ADDRESSMODE, this._depthMap.refreshRate = 1, this._depthMap.renderParticles = !1, this._depthMap.renderList = null, this._depthMap.activeCamera = this._camera, this._depthMap.ignoreCameraViewport = !0, this._depthMap.useCameraPostProcesses = !1, this._depthMap.onClearObservable.add((d) => {
      d.clear(this.clearColor, !0, !0, !0);
    }), this._depthMap.onBeforeBindObservable.add(() => {
      var d;
      (d = a._debugPushGroup) === null || d === void 0 || d.call(a, "depth renderer", 1);
    }), this._depthMap.onAfterUnbindObservable.add(() => {
      var d;
      (d = a._debugPopGroup) === null || d === void 0 || d.call(a, 1);
    }), this._depthMap.customIsReadyFunction = (d, E, u) => {
      if ((u || E === 0) && d.subMeshes)
        for (let _ = 0; _ < d.subMeshes.length; ++_) {
          const p = d.subMeshes[_], A = p.getRenderingMesh(), R = A._getInstancesRenderList(p._id, !!p.getReplacementMesh()), N = a.getCaps().instancedArrays && (R.visibleInstances[p._id] !== null && R.visibleInstances[p._id] !== void 0 || A.hasThinInstances);
          if (!this.isReady(p, N))
            return !1;
        }
      return !0;
    };
    const c = (d) => {
      var E, u;
      const _ = d.getRenderingMesh(), p = d.getEffectiveMesh(), A = this._scene, R = A.getEngine(), N = d.getMaterial();
      if (p._internalAbstractMeshDataInfo._isActiveIntermediate = !1, !N || p.infiniteDistance || N.disableDepthWrite || d.verticesCount === 0 || d._renderId === A.getRenderId())
        return;
      const O = p._getWorldMatrixDeterminant() < 0;
      let L = (E = _.overrideMaterialSideOrientation) !== null && E !== void 0 ? E : N.sideOrientation;
      O && (L = L === 0 ? 1 : 0);
      const U = L === 0;
      R.setState(N.backFaceCulling, 0, !1, U, this.reverseCulling ? !N.cullBackFaces : N.cullBackFaces);
      const y = _._getInstancesRenderList(d._id, !!d.getReplacementMesh());
      if (y.mustReturn)
        return;
      const D = R.getCaps().instancedArrays && (y.visibleInstances[d._id] !== null && y.visibleInstances[d._id] !== void 0 || _.hasThinInstances), w = this._camera || A.activeCamera;
      if (this.isReady(d, D) && w) {
        d._renderId = A.getRenderId();
        const X = (u = p._internalAbstractMeshDataInfo._materialForRenderPass) === null || u === void 0 ? void 0 : u[R.currentRenderPassId];
        let H = d._getDrawWrapper();
        !H && X && (H = X._getDrawWrapper());
        const Ae = w.mode === Se.ORTHOGRAPHIC_CAMERA;
        if (!H)
          return;
        const ee = H.effect;
        R.enableEffect(H), D || _._bind(d, ee, N.fillMode), X ? X.bindForSubMesh(p.getWorldMatrix(), p, d) : (ee.setMatrix("viewProjection", A.getTransformMatrix()), ee.setMatrix("world", p.getWorldMatrix()), this._storeCameraSpaceZ && ee.setMatrix("view", A.getViewMatrix()));
        let ge, xe;
        if (Ae ? (ge = !R.useReverseDepthBuffer && R.isNDCHalfZRange ? 0 : 1, xe = R.useReverseDepthBuffer && R.isNDCHalfZRange ? 0 : 1) : (ge = R.useReverseDepthBuffer && R.isNDCHalfZRange ? w.minZ : R.isNDCHalfZRange ? 0 : w.minZ, xe = R.useReverseDepthBuffer && R.isNDCHalfZRange ? 0 : w.maxZ), ee.setFloat2("depthValues", ge, ge + xe), !X) {
          if (N.needAlphaTesting()) {
            const fe = N.getAlphaTestTexture();
            fe && (ee.setTexture("diffuseSampler", fe), ee.setMatrix("diffuseMatrix", fe.getTextureMatrix()));
          }
          if (_.useBones && _.computeBonesUsingShaders && _.skeleton) {
            const fe = _.skeleton;
            if (fe.isUsingTextureForMatrices) {
              const Le = fe.getTransformMatrixTexture(_);
              if (!Le)
                return;
              ee.setTexture("boneSampler", Le), ee.setFloat("boneTextureWidth", 4 * (fe.bones.length + 1));
            } else
              ee.setMatrices("mBones", fe.getTransformMatrices(_));
          }
          Nt(ee, N, A), M.BindMorphTargetParameters(_, ee), _.morphTargetManager && _.morphTargetManager.isUsingTextureForTargets && _.morphTargetManager._bind(ee);
        }
        _._processRendering(p, d, ee, N.fillMode, y, D, (fe, Le) => ee.setMatrix("world", Le));
      }
    };
    this._depthMap.customRenderFunction = (d, E, u, _) => {
      let p;
      if (_.length)
        for (p = 0; p < _.length; p++)
          c(_.data[p]);
      for (p = 0; p < d.length; p++)
        c(d.data[p]);
      for (p = 0; p < E.length; p++)
        c(E.data[p]);
      if (this.forceDepthWriteTransparentMeshes)
        for (p = 0; p < u.length; p++)
          c(u.data[p]);
      else
        for (p = 0; p < u.length; p++)
          u.data[p].getEffectiveMesh()._internalAbstractMeshDataInfo._isActiveIntermediate = !1;
    };
  }
  /**
   * Creates the depth rendering effect and checks if the effect is ready.
   * @param subMesh The submesh to be used to render the depth map of
   * @param useInstances If multiple world instances should be used
   * @returns if the depth renderer is ready to render the depth map
   */
  isReady(e, t) {
    var i;
    const r = this._scene.getEngine(), s = e.getMesh(), n = s.getScene(), o = (i = s._internalAbstractMeshDataInfo._materialForRenderPass) === null || i === void 0 ? void 0 : i[r.currentRenderPassId];
    if (o)
      return o.isReadyForSubMesh(s, e, t);
    const a = e.getMaterial();
    if (!a || a.disableDepthWrite)
      return !1;
    const f = [], c = [k.PositionKind];
    if (a && a.needAlphaTesting() && a.getAlphaTestTexture() && (f.push("#define ALPHATEST"), s.isVerticesDataPresent(k.UVKind) && (c.push(k.UVKind), f.push("#define UV1")), s.isVerticesDataPresent(k.UV2Kind) && (c.push(k.UV2Kind), f.push("#define UV2"))), s.useBones && s.computeBonesUsingShaders) {
      c.push(k.MatricesIndicesKind), c.push(k.MatricesWeightsKind), s.numBoneInfluencers > 4 && (c.push(k.MatricesIndicesExtraKind), c.push(k.MatricesWeightsExtraKind)), f.push("#define NUM_BONE_INFLUENCERS " + s.numBoneInfluencers), f.push("#define BonesPerMesh " + (s.skeleton ? s.skeleton.bones.length + 1 : 0));
      const A = e.getRenderingMesh().skeleton;
      A != null && A.isUsingTextureForMatrices && f.push("#define BONETEXTURE");
    } else
      f.push("#define NUM_BONE_INFLUENCERS 0");
    const d = s.morphTargetManager;
    let E = 0;
    d && d.numInfluencers > 0 && (E = d.numInfluencers, f.push("#define MORPHTARGETS"), f.push("#define NUM_MORPH_INFLUENCERS " + E), d.isUsingTextureForTargets && f.push("#define MORPHTARGETS_TEXTURE"), M.PrepareAttributesForMorphTargetsInfluencers(c, s, E)), t && (f.push("#define INSTANCES"), M.PushAttributesForInstances(c), e.getRenderingMesh().hasThinInstances && f.push("#define THIN_INSTANCES")), this._storeNonLinearDepth && f.push("#define NONLINEARDEPTH"), this._storeCameraSpaceZ && f.push("#define STORE_CAMERASPACE_Z"), this.isPacked && f.push("#define PACKED"), Pi(a, n, f);
    const u = e._getDrawWrapper(void 0, !0), _ = u.defines, p = f.join(`
`);
    if (_ !== p) {
      const A = [
        "world",
        "mBones",
        "boneTextureWidth",
        "viewProjection",
        "view",
        "diffuseMatrix",
        "depthValues",
        "morphTargetInfluences",
        "morphTargetTextureInfo",
        "morphTargetTextureIndices"
      ];
      Ot(A), u.setEffect(r.createEffect("depth", c, A, ["diffuseSampler", "morphTargets", "boneSampler"], p, void 0, void 0, void 0, {
        maxSimultaneousMorphTargets: E
      }), p);
    }
    return u.effect.isReady();
  }
  /**
   * Gets the texture which the depth map will be written to.
   * @returns The depth map texture
   */
  getDepthMap() {
    return this._depthMap;
  }
  /**
   * Disposes of the depth renderer.
   */
  dispose() {
    const e = [];
    for (const t in this._scene._depthRenderer)
      this._scene._depthRenderer[t] === this && e.push(t);
    if (e.length > 0) {
      this._depthMap.dispose();
      for (const t of e)
        delete this._scene._depthRenderer[t];
    }
  }
}
kt._SceneComponentInitialization = (l) => {
  throw pt("DepthRendererSceneComponent");
};
const Ys = "minmaxReduxPixelShader", Qs = `varying vec2 vUV;
uniform sampler2D textureSampler;
#if defined(INITIAL)
uniform sampler2D sourceTexture;
uniform vec2 texSize;
void main(void)
{
ivec2 coord=ivec2(vUV*(texSize-1.0));
float f1=texelFetch(sourceTexture,coord,0).r;
float f2=texelFetch(sourceTexture,coord+ivec2(1,0),0).r;
float f3=texelFetch(sourceTexture,coord+ivec2(1,1),0).r;
float f4=texelFetch(sourceTexture,coord+ivec2(0,1),0).r;
float minz=min(min(min(f1,f2),f3),f4);
#ifdef DEPTH_REDUX
float maxz=max(max(max(sign(1.0-f1)*f1,sign(1.0-f2)*f2),sign(1.0-f3)*f3),sign(1.0-f4)*f4);
#else
float maxz=max(max(max(f1,f2),f3),f4);
#endif
glFragColor=vec4(minz,maxz,0.,0.);
}
#elif defined(MAIN)
uniform vec2 texSize;
void main(void)
{
ivec2 coord=ivec2(vUV*(texSize-1.0));
vec2 f1=texelFetch(textureSampler,coord,0).rg;
vec2 f2=texelFetch(textureSampler,coord+ivec2(1,0),0).rg;
vec2 f3=texelFetch(textureSampler,coord+ivec2(1,1),0).rg;
vec2 f4=texelFetch(textureSampler,coord+ivec2(0,1),0).rg;
float minz=min(min(min(f1.x,f2.x),f3.x),f4.x);
float maxz=max(max(max(f1.y,f2.y),f3.y),f4.y);
glFragColor=vec4(minz,maxz,0.,0.);
}
#elif defined(ONEBEFORELAST)
uniform ivec2 texSize;
void main(void)
{
ivec2 coord=ivec2(vUV*vec2(texSize-1));
vec2 f1=texelFetch(textureSampler,coord % texSize,0).rg;
vec2 f2=texelFetch(textureSampler,(coord+ivec2(1,0)) % texSize,0).rg;
vec2 f3=texelFetch(textureSampler,(coord+ivec2(1,1)) % texSize,0).rg;
vec2 f4=texelFetch(textureSampler,(coord+ivec2(0,1)) % texSize,0).rg;
float minz=min(f1.x,f2.x);
float maxz=max(f1.y,f2.y);
glFragColor=vec4(minz,maxz,0.,0.);
}
#elif defined(LAST)
void main(void)
{
glFragColor=vec4(0.);
if (true) { 
discard;
}
}
#endif
`;
C.ShadersStore[Ys] = Qs;
class Ks {
  /**
   * Creates a min/max reducer
   * @param camera The camera to use for the post processes
   */
  constructor(e) {
    this.onAfterReductionPerformed = new $(), this._forceFullscreenViewport = !0, this._activated = !1, this._camera = e, this._postProcessManager = new Li(e.getScene()), this._onContextRestoredObserver = e.getEngine().onContextRestoredObservable.add(() => {
      this._postProcessManager._rebuild();
    });
  }
  /**
   * Gets the texture used to read the values from.
   */
  get sourceTexture() {
    return this._sourceTexture;
  }
  /**
   * Sets the source texture to read the values from.
   * One must indicate if the texture is a depth texture or not through the depthRedux parameter
   * because in such textures '1' value must not be taken into account to compute the maximum
   * as this value is used to clear the texture.
   * Note that the computation is not activated by calling this function, you must call activate() for that!
   * @param sourceTexture The texture to read the values from. The values should be in the red channel.
   * @param depthRedux Indicates if the texture is a depth texture or not
   * @param type The type of the textures created for the reduction (defaults to TEXTURETYPE_HALF_FLOAT)
   * @param forceFullscreenViewport Forces the post processes used for the reduction to be applied without taking into account viewport (defaults to true)
   */
  setSourceTexture(e, t, i = 2, r = !0) {
    if (e === this._sourceTexture)
      return;
    this.dispose(!1), this._sourceTexture = e, this._reductionSteps = [], this._forceFullscreenViewport = r;
    const s = this._camera.getScene(), n = new W(
      "Initial reduction phase",
      "minmaxRedux",
      // shader
      ["texSize"],
      ["sourceTexture"],
      // textures
      1,
      // options
      null,
      // camera
      1,
      // sampling
      s.getEngine(),
      // engine
      !1,
      // reusable
      "#define INITIAL" + (t ? `
#define DEPTH_REDUX` : ""),
      // defines
      i,
      void 0,
      void 0,
      void 0,
      7
    );
    n.autoClear = !1, n.forceFullscreenViewport = r;
    let o = this._sourceTexture.getRenderWidth(), a = this._sourceTexture.getRenderHeight();
    n.onApply = ((c, d) => (E) => {
      E.setTexture("sourceTexture", this._sourceTexture), E.setFloat2("texSize", c, d);
    })(o, a), this._reductionSteps.push(n);
    let f = 1;
    for (; o > 1 || a > 1; ) {
      o = Math.max(Math.round(o / 2), 1), a = Math.max(Math.round(a / 2), 1);
      const c = new W(
        "Reduction phase " + f,
        "minmaxRedux",
        // shader
        ["texSize"],
        null,
        { width: o, height: a },
        // options
        null,
        // camera
        1,
        // sampling
        s.getEngine(),
        // engine
        !1,
        // reusable
        "#define " + (o == 1 && a == 1 ? "LAST" : o == 1 || a == 1 ? "ONEBEFORELAST" : "MAIN"),
        // defines
        i,
        void 0,
        void 0,
        void 0,
        7
      );
      if (c.autoClear = !1, c.forceFullscreenViewport = r, c.onApply = ((d, E) => (u) => {
        d == 1 || E == 1 ? u.setInt2("texSize", d, E) : u.setFloat2("texSize", d, E);
      })(o, a), this._reductionSteps.push(c), f++, o == 1 && a == 1) {
        const d = (E, u, _) => {
          const p = new Float32Array(4 * E * u), A = { min: 0, max: 0 };
          return () => {
            s.getEngine()._readTexturePixels(_.inputTexture.texture, E, u, -1, 0, p, !1), A.min = p[0], A.max = p[1], this.onAfterReductionPerformed.notifyObservers(A);
          };
        };
        c.onAfterRenderObservable.add(d(o, a, c));
      }
    }
  }
  /**
   * Defines the refresh rate of the computation.
   * Use 0 to compute just once, 1 to compute on every frame, 2 to compute every two frames and so on...
   */
  get refreshRate() {
    return this._sourceTexture ? this._sourceTexture.refreshRate : -1;
  }
  set refreshRate(e) {
    this._sourceTexture && (this._sourceTexture.refreshRate = e);
  }
  /**
   * Gets the activation status of the reducer
   */
  get activated() {
    return this._activated;
  }
  /**
   * Activates the reduction computation.
   * When activated, the observers registered in onAfterReductionPerformed are
   * called after the computation is performed
   */
  activate() {
    this._onAfterUnbindObserver || !this._sourceTexture || (this._onAfterUnbindObserver = this._sourceTexture.onAfterUnbindObservable.add(() => {
      var e, t;
      const i = this._camera.getScene().getEngine();
      (e = i._debugPushGroup) === null || e === void 0 || e.call(i, "min max reduction", 1), this._reductionSteps[0].activate(this._camera), this._postProcessManager.directRender(this._reductionSteps, this._reductionSteps[0].inputTexture, this._forceFullscreenViewport), i.unBindFramebuffer(this._reductionSteps[0].inputTexture, !1), (t = i._debugPopGroup) === null || t === void 0 || t.call(i, 1);
    }), this._activated = !0);
  }
  /**
   * Deactivates the reduction computation.
   */
  deactivate() {
    !this._onAfterUnbindObserver || !this._sourceTexture || (this._sourceTexture.onAfterUnbindObservable.remove(this._onAfterUnbindObserver), this._onAfterUnbindObserver = null, this._activated = !1);
  }
  /**
   * Disposes the min/max reducer
   * @param disposeAll true to dispose all the resources. You should always call this function with true as the parameter (or without any parameter as it is the default one). This flag is meant to be used internally.
   */
  dispose(e = !0) {
    if (e && (this.onAfterReductionPerformed.clear(), this._onContextRestoredObserver && (this._camera.getEngine().onContextRestoredObservable.remove(this._onContextRestoredObserver), this._onContextRestoredObserver = null)), this.deactivate(), this._reductionSteps) {
      for (let t = 0; t < this._reductionSteps.length; ++t)
        this._reductionSteps[t].dispose();
      this._reductionSteps = null;
    }
    this._postProcessManager && e && this._postProcessManager.dispose(), this._sourceTexture = null;
  }
}
class Zs extends Ks {
  /**
   * Gets the depth renderer used for the computation.
   * Note that the result is null if you provide your own renderer when calling setDepthRenderer.
   */
  get depthRenderer() {
    return this._depthRenderer;
  }
  /**
   * Creates a depth reducer
   * @param camera The camera used to render the depth texture
   */
  constructor(e) {
    super(e);
  }
  /**
   * Sets the depth renderer to use to generate the depth map
   * @param depthRenderer The depth renderer to use. If not provided, a new one will be created automatically
   * @param type The texture type of the depth map (default: TEXTURETYPE_HALF_FLOAT)
   * @param forceFullscreenViewport Forces the post processes used for the reduction to be applied without taking into account viewport (defaults to true)
   */
  setDepthRenderer(e = null, t = 2, i = !0) {
    const r = this._camera.getScene();
    this._depthRenderer && (delete r._depthRenderer[this._depthRendererId], this._depthRenderer.dispose(), this._depthRenderer = null), e === null && (r._depthRenderer || (r._depthRenderer = {}), e = this._depthRenderer = new kt(r, t, this._camera, !1, 1), e.enabled = !1, this._depthRendererId = "minmax" + this._camera.id, r._depthRenderer[this._depthRendererId] = e), super.setSourceTexture(e.getDepthMap(), !0, t, i);
  }
  /**
   * @internal
   */
  setSourceTexture(e, t, i = 2, r = !0) {
    super.setSourceTexture(e, t, i, r);
  }
  /**
   * Activates the reduction computation.
   * When activated, the observers registered in onAfterReductionPerformed are
   * called after the computation is performed
   */
  activate() {
    this._depthRenderer && (this._depthRenderer.enabled = !0), super.activate();
  }
  /**
   * Deactivates the reduction computation.
   */
  deactivate() {
    super.deactivate(), this._depthRenderer && (this._depthRenderer.enabled = !1);
  }
  /**
   * Disposes the depth reducer
   * @param disposeAll true to dispose all the resources. You should always call this function with true as the parameter (or without any parameter as it is the default one). This flag is meant to be used internally.
   */
  dispose(e = !0) {
    if (super.dispose(e), this._depthRenderer && e) {
      const t = this._depthRenderer.getDepthMap().getScene();
      t && delete t._depthRenderer[this._depthRendererId], this._depthRenderer.dispose(), this._depthRenderer = null;
    }
  }
}
const gi = g.Up(), js = g.Zero(), te = new g(), nt = new g(), bt = new B();
class re extends P {
  _validateFilter(e) {
    return e === P.FILTER_NONE || e === P.FILTER_PCF || e === P.FILTER_PCSS ? e : (console.error('Unsupported filter "' + e + '"!'), P.FILTER_NONE);
  }
  /**
   * Gets or set the number of cascades used by the CSM.
   */
  get numCascades() {
    return this._numCascades;
  }
  set numCascades(e) {
    e = Math.min(Math.max(e, re.MIN_CASCADES_COUNT), re.MAX_CASCADES_COUNT), e !== this._numCascades && (this._numCascades = e, this.recreateShadowMap(), this._recreateSceneUBOs());
  }
  /**
   * Enables or disables the shadow casters bounding info computation.
   * If your shadow casters don't move, you can disable this feature.
   * If it is enabled, the bounding box computation is done every frame.
   */
  get freezeShadowCastersBoundingInfo() {
    return this._freezeShadowCastersBoundingInfo;
  }
  set freezeShadowCastersBoundingInfo(e) {
    this._freezeShadowCastersBoundingInfoObservable && e && (this._scene.onBeforeRenderObservable.remove(this._freezeShadowCastersBoundingInfoObservable), this._freezeShadowCastersBoundingInfoObservable = null), !this._freezeShadowCastersBoundingInfoObservable && !e && (this._freezeShadowCastersBoundingInfoObservable = this._scene.onBeforeRenderObservable.add(this._computeShadowCastersBoundingInfo.bind(this))), this._freezeShadowCastersBoundingInfo = e, e && this._computeShadowCastersBoundingInfo();
  }
  _computeShadowCastersBoundingInfo() {
    if (this._scbiMin.copyFromFloats(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE), this._scbiMax.copyFromFloats(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE), this._shadowMap && this._shadowMap.renderList) {
      const e = this._shadowMap.renderList;
      for (let i = 0; i < e.length; i++) {
        const r = e[i];
        if (!r)
          continue;
        const s = r.getBoundingInfo(), n = s.boundingBox;
        this._scbiMin.minimizeInPlace(n.minimumWorld), this._scbiMax.maximizeInPlace(n.maximumWorld);
      }
      const t = this._scene.meshes;
      for (let i = 0; i < t.length; i++) {
        const r = t[i];
        if (!r || !r.isVisible || !r.isEnabled || !r.receiveShadows)
          continue;
        const s = r.getBoundingInfo(), n = s.boundingBox;
        this._scbiMin.minimizeInPlace(n.minimumWorld), this._scbiMax.maximizeInPlace(n.maximumWorld);
      }
    }
    this._shadowCastersBoundingInfo.reConstruct(this._scbiMin, this._scbiMax);
  }
  /**
   * Gets or sets the shadow casters bounding info.
   * If you provide your own shadow casters bounding info, first enable freezeShadowCastersBoundingInfo
   * so that the system won't overwrite the bounds you provide
   */
  get shadowCastersBoundingInfo() {
    return this._shadowCastersBoundingInfo;
  }
  set shadowCastersBoundingInfo(e) {
    this._shadowCastersBoundingInfo = e;
  }
  /**
   * Sets the minimal and maximal distances to use when computing the cascade breaks.
   *
   * The values of min / max are typically the depth zmin and zmax values of your scene, for a given frame.
   * If you don't know these values, simply leave them to their defaults and don't call this function.
   * @param min minimal distance for the breaks (default to 0.)
   * @param max maximal distance for the breaks (default to 1.)
   */
  setMinMaxDistance(e, t) {
    this._minDistance === e && this._maxDistance === t || (e > t && (e = 0, t = 1), e < 0 && (e = 0), t > 1 && (t = 1), this._minDistance = e, this._maxDistance = t, this._breaksAreDirty = !0);
  }
  /** Gets the minimal distance used in the cascade break computation */
  get minDistance() {
    return this._minDistance;
  }
  /** Gets the maximal distance used in the cascade break computation */
  get maxDistance() {
    return this._maxDistance;
  }
  /**
   * Gets the class name of that object
   * @returns "CascadedShadowGenerator"
   */
  getClassName() {
    return re.CLASSNAME;
  }
  /**
   * Gets a cascade minimum extents
   * @param cascadeIndex index of the cascade
   * @returns the minimum cascade extents
   */
  getCascadeMinExtents(e) {
    return e >= 0 && e < this._numCascades ? this._cascadeMinExtents[e] : null;
  }
  /**
   * Gets a cascade maximum extents
   * @param cascadeIndex index of the cascade
   * @returns the maximum cascade extents
   */
  getCascadeMaxExtents(e) {
    return e >= 0 && e < this._numCascades ? this._cascadeMaxExtents[e] : null;
  }
  /**
   * Gets the shadow max z distance. It's the limit beyond which shadows are not displayed.
   * It defaults to camera.maxZ
   */
  get shadowMaxZ() {
    return this._getCamera() ? this._shadowMaxZ : 0;
  }
  /**
   * Sets the shadow max z distance.
   */
  set shadowMaxZ(e) {
    const t = this._getCamera();
    if (!t) {
      this._shadowMaxZ = e;
      return;
    }
    this._shadowMaxZ === e || e < t.minZ || e > t.maxZ || (this._shadowMaxZ = e, this._light._markMeshesAsLightDirty(), this._breaksAreDirty = !0);
  }
  /**
   * Gets or sets the debug flag.
   * When enabled, the cascades are materialized by different colors on the screen.
   */
  get debug() {
    return this._debug;
  }
  set debug(e) {
    this._debug = e, this._light._markMeshesAsLightDirty();
  }
  /**
   * Gets or sets the depth clamping value.
   *
   * When enabled, it improves the shadow quality because the near z plane of the light frustum don't need to be adjusted
   * to account for the shadow casters far away.
   *
   * Note that this property is incompatible with PCSS filtering, so it won't be used in that case.
   */
  get depthClamp() {
    return this._depthClamp;
  }
  set depthClamp(e) {
    this._depthClamp = e;
  }
  /**
   * Gets or sets the percentage of blending between two cascades (value between 0. and 1.).
   * It defaults to 0.1 (10% blending).
   */
  get cascadeBlendPercentage() {
    return this._cascadeBlendPercentage;
  }
  set cascadeBlendPercentage(e) {
    this._cascadeBlendPercentage = e, this._light._markMeshesAsLightDirty();
  }
  /**
   * Gets or set the lambda parameter.
   * This parameter is used to split the camera frustum and create the cascades.
   * It's a value between 0. and 1.: If 0, the split is a uniform split of the frustum, if 1 it is a logarithmic split.
   * For all values in-between, it's a linear combination of the uniform and logarithm split algorithm.
   */
  get lambda() {
    return this._lambda;
  }
  set lambda(e) {
    const t = Math.min(Math.max(e, 0), 1);
    this._lambda != t && (this._lambda = t, this._breaksAreDirty = !0);
  }
  /**
   * Gets the view matrix corresponding to a given cascade
   * @param cascadeNum cascade to retrieve the view matrix from
   * @returns the cascade view matrix
   */
  getCascadeViewMatrix(e) {
    return e >= 0 && e < this._numCascades ? this._viewMatrices[e] : null;
  }
  /**
   * Gets the projection matrix corresponding to a given cascade
   * @param cascadeNum cascade to retrieve the projection matrix from
   * @returns the cascade projection matrix
   */
  getCascadeProjectionMatrix(e) {
    return e >= 0 && e < this._numCascades ? this._projectionMatrices[e] : null;
  }
  /**
   * Gets the transformation matrix corresponding to a given cascade
   * @param cascadeNum cascade to retrieve the transformation matrix from
   * @returns the cascade transformation matrix
   */
  getCascadeTransformMatrix(e) {
    return e >= 0 && e < this._numCascades ? this._transformMatrices[e] : null;
  }
  /**
   * Sets the depth renderer to use when autoCalcDepthBounds is enabled.
   *
   * Note that if no depth renderer is set, a new one will be automatically created internally when necessary.
   *
   * You should call this function if you already have a depth renderer enabled in your scene, to avoid
   * doing multiple depth rendering each frame. If you provide your own depth renderer, make sure it stores linear depth!
   * @param depthRenderer The depth renderer to use when autoCalcDepthBounds is enabled. If you pass null or don't call this function at all, a depth renderer will be automatically created
   */
  setDepthRenderer(e) {
    this._depthRenderer = e, this._depthReducer && this._depthReducer.setDepthRenderer(this._depthRenderer);
  }
  /**
   * Gets or sets the autoCalcDepthBounds property.
   *
   * When enabled, a depth rendering pass is first performed (with an internally created depth renderer or with the one
   * you provide by calling setDepthRenderer). Then, a min/max reducing is applied on the depth map to compute the
   * minimal and maximal depth of the map and those values are used as inputs for the setMinMaxDistance() function.
   * It can greatly enhance the shadow quality, at the expense of more GPU works.
   * When using this option, you should increase the value of the lambda parameter, and even set it to 1 for best results.
   */
  get autoCalcDepthBounds() {
    return this._autoCalcDepthBounds;
  }
  set autoCalcDepthBounds(e) {
    const t = this._getCamera();
    if (t) {
      if (this._autoCalcDepthBounds = e, !e) {
        this._depthReducer && this._depthReducer.deactivate(), this.setMinMaxDistance(0, 1);
        return;
      }
      this._depthReducer || (this._depthReducer = new Zs(t), this._depthReducer.onAfterReductionPerformed.add((i) => {
        let r = i.min, s = i.max;
        r >= s && (r = 0, s = 1), (r != this._minDistance || s != this._maxDistance) && this.setMinMaxDistance(r, s);
      }), this._depthReducer.setDepthRenderer(this._depthRenderer)), this._depthReducer.activate();
    }
  }
  /**
   * Defines the refresh rate of the min/max computation used when autoCalcDepthBounds is set to true
   * Use 0 to compute just once, 1 to compute on every frame, 2 to compute every two frames and so on...
   * Note that if you provided your own depth renderer through a call to setDepthRenderer, you are responsible
   * for setting the refresh rate on the renderer yourself!
   */
  get autoCalcDepthBoundsRefreshRate() {
    var e, t, i;
    return (i = (t = (e = this._depthReducer) === null || e === void 0 ? void 0 : e.depthRenderer) === null || t === void 0 ? void 0 : t.getDepthMap().refreshRate) !== null && i !== void 0 ? i : -1;
  }
  set autoCalcDepthBoundsRefreshRate(e) {
    var t;
    !((t = this._depthReducer) === null || t === void 0) && t.depthRenderer && (this._depthReducer.depthRenderer.getDepthMap().refreshRate = e);
  }
  /**
   * Create the cascade breaks according to the lambda, shadowMaxZ and min/max distance properties, as well as the camera near and far planes.
   * This function is automatically called when updating lambda, shadowMaxZ and min/max distances, however you should call it yourself if
   * you change the camera near/far planes!
   */
  splitFrustum() {
    this._breaksAreDirty = !0;
  }
  _splitFrustum() {
    const e = this._getCamera();
    if (!e)
      return;
    const t = e.minZ, i = e.maxZ, r = i - t, s = this._minDistance, n = this._shadowMaxZ < i && this._shadowMaxZ >= t ? Math.min((this._shadowMaxZ - t) / (i - t), this._maxDistance) : this._maxDistance, o = t + s * r, a = t + n * r, f = a - o, c = a / o;
    for (let d = 0; d < this._cascades.length; ++d) {
      const E = (d + 1) / this._numCascades, u = o * c ** E, _ = o + f * E, p = this._lambda * (u - _) + _;
      this._cascades[d].prevBreakDistance = d === 0 ? s : this._cascades[d - 1].breakDistance, this._cascades[d].breakDistance = (p - t) / r, this._viewSpaceFrustumsZ[d] = p, this._frustumLengths[d] = (this._cascades[d].breakDistance - this._cascades[d].prevBreakDistance) * r;
    }
    this._breaksAreDirty = !1;
  }
  _computeMatrices() {
    const e = this._scene;
    if (!this._getCamera())
      return;
    g.NormalizeToRef(this._light.getShadowDirection(0), this._lightDirection), Math.abs(g.Dot(this._lightDirection, g.Up())) === 1 && (this._lightDirection.z = 1e-13), this._cachedDirection.copyFrom(this._lightDirection);
    const i = e.getEngine().useReverseDepthBuffer;
    for (let r = 0; r < this._numCascades; ++r) {
      this._computeFrustumInWorldSpace(r), this._computeCascadeFrustum(r), this._cascadeMaxExtents[r].subtractToRef(this._cascadeMinExtents[r], te), this._frustumCenter[r].addToRef(this._lightDirection.scale(this._cascadeMinExtents[r].z), this._shadowCameraPos[r]), B.LookAtLHToRef(this._shadowCameraPos[r], this._frustumCenter[r], gi, this._viewMatrices[r]);
      let s = 0, n = te.z;
      const o = this._shadowCastersBoundingInfo;
      o.update(this._viewMatrices[r]), n = Math.min(n, o.boundingBox.maximumWorld.z), !this._depthClamp || this.filter === P.FILTER_PCSS ? s = Math.min(s, o.boundingBox.minimumWorld.z) : s = Math.max(s, o.boundingBox.minimumWorld.z), B.OrthoOffCenterLHToRef(this._cascadeMinExtents[r].x, this._cascadeMaxExtents[r].x, this._cascadeMinExtents[r].y, this._cascadeMaxExtents[r].y, i ? n : s, i ? s : n, this._projectionMatrices[r], e.getEngine().isNDCHalfZRange), this._cascadeMinExtents[r].z = s, this._cascadeMaxExtents[r].z = n, this._viewMatrices[r].multiplyToRef(this._projectionMatrices[r], this._transformMatrices[r]), g.TransformCoordinatesToRef(js, this._transformMatrices[r], te), te.scaleInPlace(this._mapSize / 2), nt.copyFromFloats(Math.round(te.x), Math.round(te.y), Math.round(te.z)), nt.subtractInPlace(te).scaleInPlace(2 / this._mapSize), B.TranslationToRef(nt.x, nt.y, 0, bt), this._projectionMatrices[r].multiplyToRef(bt, this._projectionMatrices[r]), this._viewMatrices[r].multiplyToRef(this._projectionMatrices[r], this._transformMatrices[r]), this._transformMatrices[r].copyToArray(this._transformMatricesAsArray, r * 16);
    }
  }
  // Get the 8 points of the view frustum in world space
  _computeFrustumInWorldSpace(e) {
    const t = this._getCamera();
    if (!t)
      return;
    const i = this._cascades[e].prevBreakDistance, r = this._cascades[e].breakDistance, s = this._scene.getEngine().isNDCHalfZRange;
    t.getViewMatrix();
    const n = B.Invert(t.getTransformationMatrix()), o = this._scene.getEngine().useReverseDepthBuffer ? 4 : 0;
    for (let a = 0; a < re._FrustumCornersNDCSpace.length; ++a)
      te.copyFrom(re._FrustumCornersNDCSpace[(a + o) % re._FrustumCornersNDCSpace.length]), s && te.z === -1 && (te.z = 0), g.TransformCoordinatesToRef(te, n, this._frustumCornersWorldSpace[e][a]);
    for (let a = 0; a < re._FrustumCornersNDCSpace.length / 2; ++a)
      te.copyFrom(this._frustumCornersWorldSpace[e][a + 4]).subtractInPlace(this._frustumCornersWorldSpace[e][a]), nt.copyFrom(te).scaleInPlace(i), te.scaleInPlace(r), te.addInPlace(this._frustumCornersWorldSpace[e][a]), this._frustumCornersWorldSpace[e][a + 4].copyFrom(te), this._frustumCornersWorldSpace[e][a].addInPlace(nt);
  }
  _computeCascadeFrustum(e) {
    if (this._cascadeMinExtents[e].copyFromFloats(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE), this._cascadeMaxExtents[e].copyFromFloats(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE), this._frustumCenter[e].copyFromFloats(0, 0, 0), !!this._getCamera()) {
      for (let i = 0; i < this._frustumCornersWorldSpace[e].length; ++i)
        this._frustumCenter[e].addInPlace(this._frustumCornersWorldSpace[e][i]);
      if (this._frustumCenter[e].scaleInPlace(1 / this._frustumCornersWorldSpace[e].length), this.stabilizeCascades) {
        let i = 0;
        for (let r = 0; r < this._frustumCornersWorldSpace[e].length; ++r) {
          const s = this._frustumCornersWorldSpace[e][r].subtractToRef(this._frustumCenter[e], te).length();
          i = Math.max(i, s);
        }
        i = Math.ceil(i * 16) / 16, this._cascadeMaxExtents[e].copyFromFloats(i, i, i), this._cascadeMinExtents[e].copyFromFloats(-i, -i, -i);
      } else {
        const i = this._frustumCenter[e];
        this._frustumCenter[e].addToRef(this._lightDirection, te), B.LookAtLHToRef(i, te, gi, bt);
        for (let r = 0; r < this._frustumCornersWorldSpace[e].length; ++r)
          g.TransformCoordinatesToRef(this._frustumCornersWorldSpace[e][r], bt, te), this._cascadeMinExtents[e].minimizeInPlace(te), this._cascadeMaxExtents[e].maximizeInPlace(te);
      }
    }
  }
  _recreateSceneUBOs() {
    if (this._disposeSceneUBOs(), this._sceneUBOs)
      for (let e = 0; e < this._numCascades; ++e)
        this._sceneUBOs.push(this._scene.createSceneUniformBuffer(`Scene for CSM Shadow Generator (light "${this._light.name}" cascade #${e})`));
  }
  /**
   *  Support test.
   */
  static get IsSupported() {
    const e = oi.LastCreatedEngine;
    return e ? e._features.supportCSM : !1;
  }
  /**
   * Creates a Cascaded Shadow Generator object.
   * A ShadowGenerator is the required tool to use the shadows.
   * Each directional light casting shadows needs to use its own ShadowGenerator.
   * Documentation : https://doc.babylonjs.com/babylon101/cascadedShadows
   * @param mapSize The size of the texture what stores the shadows. Example : 1024.
   * @param light The directional light object generating the shadows.
   * @param usefulFloatFirst By default the generator will try to use half float textures but if you need precision (for self shadowing for instance), you can use this option to enforce full float texture.
   * @param camera Camera associated with this shadow generator (default: null). If null, takes the scene active camera at the time we need to access it
   */
  constructor(e, t, i, r) {
    if (!re.IsSupported) {
      pe.Error("CascadedShadowMap is not supported by the current engine.");
      return;
    }
    super(e, t, i, r), this.usePercentageCloserFiltering = !0;
  }
  _initializeGenerator() {
    var e, t, i, r, s, n, o, a, f, c, d, E, u, _, p, A, R, N, O, L;
    this.penumbraDarkness = (e = this.penumbraDarkness) !== null && e !== void 0 ? e : 1, this._numCascades = (t = this._numCascades) !== null && t !== void 0 ? t : re.DEFAULT_CASCADES_COUNT, this.stabilizeCascades = (i = this.stabilizeCascades) !== null && i !== void 0 ? i : !1, this._freezeShadowCastersBoundingInfoObservable = (r = this._freezeShadowCastersBoundingInfoObservable) !== null && r !== void 0 ? r : null, this.freezeShadowCastersBoundingInfo = (s = this.freezeShadowCastersBoundingInfo) !== null && s !== void 0 ? s : !1, this._scbiMin = (n = this._scbiMin) !== null && n !== void 0 ? n : new g(0, 0, 0), this._scbiMax = (o = this._scbiMax) !== null && o !== void 0 ? o : new g(0, 0, 0), this._shadowCastersBoundingInfo = (a = this._shadowCastersBoundingInfo) !== null && a !== void 0 ? a : new rr(new g(0, 0, 0), new g(0, 0, 0)), this._breaksAreDirty = (f = this._breaksAreDirty) !== null && f !== void 0 ? f : !0, this._minDistance = (c = this._minDistance) !== null && c !== void 0 ? c : 0, this._maxDistance = (d = this._maxDistance) !== null && d !== void 0 ? d : 1, this._currentLayer = (E = this._currentLayer) !== null && E !== void 0 ? E : 0, this._shadowMaxZ = (p = (u = this._shadowMaxZ) !== null && u !== void 0 ? u : (_ = this._getCamera()) === null || _ === void 0 ? void 0 : _.maxZ) !== null && p !== void 0 ? p : 1e4, this._debug = (A = this._debug) !== null && A !== void 0 ? A : !1, this._depthClamp = (R = this._depthClamp) !== null && R !== void 0 ? R : !0, this._cascadeBlendPercentage = (N = this._cascadeBlendPercentage) !== null && N !== void 0 ? N : 0.1, this._lambda = (O = this._lambda) !== null && O !== void 0 ? O : 0.5, this._autoCalcDepthBounds = (L = this._autoCalcDepthBounds) !== null && L !== void 0 ? L : !1, this._recreateSceneUBOs(), super._initializeGenerator();
  }
  _createTargetRenderTexture() {
    const e = this._scene.getEngine(), t = { width: this._mapSize, height: this._mapSize, layers: this.numCascades };
    this._shadowMap = new ve(
      this._light.name + "_CSMShadowMap",
      t,
      this._scene,
      !1,
      !0,
      this._textureType,
      !1,
      void 0,
      !1,
      !1,
      void 0
      /*, 6*/
    ), this._shadowMap.createDepthStencilTexture(e.useReverseDepthBuffer ? 516 : 513, !0);
  }
  _initializeShadowMap() {
    if (super._initializeShadowMap(), this._shadowMap === null)
      return;
    this._transformMatricesAsArray = new Float32Array(this._numCascades * 16), this._viewSpaceFrustumsZ = new Array(this._numCascades), this._frustumLengths = new Array(this._numCascades), this._lightSizeUVCorrection = new Array(this._numCascades * 2), this._depthCorrection = new Array(this._numCascades), this._cascades = [], this._viewMatrices = [], this._projectionMatrices = [], this._transformMatrices = [], this._cascadeMinExtents = [], this._cascadeMaxExtents = [], this._frustumCenter = [], this._shadowCameraPos = [], this._frustumCornersWorldSpace = [];
    for (let t = 0; t < this._numCascades; ++t) {
      this._cascades[t] = {
        prevBreakDistance: 0,
        breakDistance: 0
      }, this._viewMatrices[t] = B.Zero(), this._projectionMatrices[t] = B.Zero(), this._transformMatrices[t] = B.Zero(), this._cascadeMinExtents[t] = new g(), this._cascadeMaxExtents[t] = new g(), this._frustumCenter[t] = new g(), this._shadowCameraPos[t] = new g(), this._frustumCornersWorldSpace[t] = new Array(re._FrustumCornersNDCSpace.length);
      for (let i = 0; i < re._FrustumCornersNDCSpace.length; ++i)
        this._frustumCornersWorldSpace[t][i] = new g();
    }
    const e = this._scene.getEngine();
    this._shadowMap.onBeforeBindObservable.clear(), this._shadowMap.onBeforeRenderObservable.clear(), this._shadowMap.onBeforeRenderObservable.add((t) => {
      this._sceneUBOs && this._scene.setSceneUniformBuffer(this._sceneUBOs[t]), this._currentLayer = t, this._filter === P.FILTER_PCF && e.setColorWrite(!1), this._scene.setTransformMatrix(this.getCascadeViewMatrix(t), this.getCascadeProjectionMatrix(t)), this._useUBO && (this._scene.getSceneUniformBuffer().unbindEffect(), this._scene.finalizeSceneUbo());
    }), this._shadowMap.onBeforeBindObservable.add(() => {
      var t;
      this._currentSceneUBO = this._scene.getSceneUniformBuffer(), (t = e._debugPushGroup) === null || t === void 0 || t.call(e, `cascaded shadow map generation for pass id ${e.currentRenderPassId}`, 1), this._breaksAreDirty && this._splitFrustum(), this._computeMatrices();
    }), this._splitFrustum();
  }
  _bindCustomEffectForRenderSubMeshForShadowMap(e, t) {
    t.setMatrix("viewProjection", this.getCascadeTransformMatrix(this._currentLayer));
  }
  _isReadyCustomDefines(e) {
    e.push("#define SM_DEPTHCLAMP " + (this._depthClamp && this._filter !== P.FILTER_PCSS ? "1" : "0"));
  }
  /**
   * Prepare all the defines in a material relying on a shadow map at the specified light index.
   * @param defines Defines of the material we want to update
   * @param lightIndex Index of the light in the enabled light list of the material
   */
  prepareDefines(e, t) {
    super.prepareDefines(e, t);
    const i = this._scene, r = this._light;
    if (!i.shadowsEnabled || !r.shadowEnabled)
      return;
    e["SHADOWCSM" + t] = !0, e["SHADOWCSMDEBUG" + t] = this.debug, e["SHADOWCSMNUM_CASCADES" + t] = this.numCascades, e["SHADOWCSM_RIGHTHANDED" + t] = i.useRightHandedSystem;
    const s = this._getCamera();
    s && this._shadowMaxZ < s.maxZ && (e["SHADOWCSMUSESHADOWMAXZ" + t] = !0), this.cascadeBlendPercentage === 0 && (e["SHADOWCSMNOBLEND" + t] = !0);
  }
  /**
   * Binds the shadow related information inside of an effect (information like near, far, darkness...
   * defined in the generator but impacting the effect).
   * @param lightIndex Index of the light in the enabled light list of the material owning the effect
   * @param effect The effect we are binfing the information for
   */
  bindShadowLight(e, t) {
    const i = this._light;
    if (!this._scene.shadowsEnabled || !i.shadowEnabled)
      return;
    const s = this._getCamera();
    if (!s)
      return;
    const n = this.getShadowMap();
    if (!n)
      return;
    const o = n.getSize().width;
    if (t.setMatrices("lightMatrix" + e, this._transformMatricesAsArray), t.setArray("viewFrustumZ" + e, this._viewSpaceFrustumsZ), t.setFloat("cascadeBlendFactor" + e, this.cascadeBlendPercentage === 0 ? 1e4 : 1 / this.cascadeBlendPercentage), t.setArray("frustumLengths" + e, this._frustumLengths), this._filter === P.FILTER_PCF)
      t.setDepthStencilTexture("shadowSampler" + e, n), i._uniformBuffer.updateFloat4("shadowsInfo", this.getDarkness(), o, 1 / o, this.frustumEdgeFalloff, e);
    else if (this._filter === P.FILTER_PCSS) {
      for (let a = 0; a < this._numCascades; ++a)
        this._lightSizeUVCorrection[a * 2 + 0] = a === 0 ? 1 : (this._cascadeMaxExtents[0].x - this._cascadeMinExtents[0].x) / (this._cascadeMaxExtents[a].x - this._cascadeMinExtents[a].x), this._lightSizeUVCorrection[a * 2 + 1] = a === 0 ? 1 : (this._cascadeMaxExtents[0].y - this._cascadeMinExtents[0].y) / (this._cascadeMaxExtents[a].y - this._cascadeMinExtents[a].y), this._depthCorrection[a] = a === 0 ? 1 : (this._cascadeMaxExtents[a].z - this._cascadeMinExtents[a].z) / (this._cascadeMaxExtents[0].z - this._cascadeMinExtents[0].z);
      t.setDepthStencilTexture("shadowSampler" + e, n), t.setTexture("depthSampler" + e, n), t.setArray2("lightSizeUVCorrection" + e, this._lightSizeUVCorrection), t.setArray("depthCorrection" + e, this._depthCorrection), t.setFloat("penumbraDarkness" + e, this.penumbraDarkness), i._uniformBuffer.updateFloat4("shadowsInfo", this.getDarkness(), 1 / o, this._contactHardeningLightSizeUVRatio * o, this.frustumEdgeFalloff, e);
    } else
      t.setTexture("shadowSampler" + e, n), i._uniformBuffer.updateFloat4("shadowsInfo", this.getDarkness(), o, 1 / o, this.frustumEdgeFalloff, e);
    i._uniformBuffer.updateFloat2("depthValues", this.getLight().getDepthMinZ(s), this.getLight().getDepthMinZ(s) + this.getLight().getDepthMaxZ(s), e);
  }
  /**
   * Gets the transformation matrix of the first cascade used to project the meshes into the map from the light point of view.
   * (eq to view projection * shadow projection matrices)
   * @returns The transform matrix used to create the shadow map
   */
  getTransformMatrix() {
    return this.getCascadeTransformMatrix(0);
  }
  /**
   * Disposes the ShadowGenerator.
   * Returns nothing.
   */
  dispose() {
    super.dispose(), this._freezeShadowCastersBoundingInfoObservable && (this._scene.onBeforeRenderObservable.remove(this._freezeShadowCastersBoundingInfoObservable), this._freezeShadowCastersBoundingInfoObservable = null), this._depthReducer && (this._depthReducer.dispose(), this._depthReducer = null);
  }
  /**
   * Serializes the shadow generator setup to a json object.
   * @returns The serialized JSON object
   */
  serialize() {
    const e = super.serialize(), t = this.getShadowMap();
    if (!t)
      return e;
    if (e.numCascades = this._numCascades, e.debug = this._debug, e.stabilizeCascades = this.stabilizeCascades, e.lambda = this._lambda, e.cascadeBlendPercentage = this.cascadeBlendPercentage, e.depthClamp = this._depthClamp, e.autoCalcDepthBounds = this.autoCalcDepthBounds, e.shadowMaxZ = this._shadowMaxZ, e.penumbraDarkness = this.penumbraDarkness, e.freezeShadowCastersBoundingInfo = this._freezeShadowCastersBoundingInfo, e.minDistance = this.minDistance, e.maxDistance = this.maxDistance, e.renderList = [], t.renderList)
      for (let i = 0; i < t.renderList.length; i++) {
        const r = t.renderList[i];
        e.renderList.push(r.id);
      }
    return e;
  }
  /**
   * Parses a serialized ShadowGenerator and returns a new ShadowGenerator.
   * @param parsedShadowGenerator The JSON object to parse
   * @param scene The scene to create the shadow map for
   * @returns The parsed shadow generator
   */
  static Parse(e, t) {
    const i = P.Parse(e, t, (r, s, n) => new re(r, s, void 0, n));
    return e.numCascades !== void 0 && (i.numCascades = e.numCascades), e.debug !== void 0 && (i.debug = e.debug), e.stabilizeCascades !== void 0 && (i.stabilizeCascades = e.stabilizeCascades), e.lambda !== void 0 && (i.lambda = e.lambda), e.cascadeBlendPercentage !== void 0 && (i.cascadeBlendPercentage = e.cascadeBlendPercentage), e.depthClamp !== void 0 && (i.depthClamp = e.depthClamp), e.autoCalcDepthBounds !== void 0 && (i.autoCalcDepthBounds = e.autoCalcDepthBounds), e.shadowMaxZ !== void 0 && (i.shadowMaxZ = e.shadowMaxZ), e.penumbraDarkness !== void 0 && (i.penumbraDarkness = e.penumbraDarkness), e.freezeShadowCastersBoundingInfo !== void 0 && (i.freezeShadowCastersBoundingInfo = e.freezeShadowCastersBoundingInfo), e.minDistance !== void 0 && e.maxDistance !== void 0 && i.setMinMaxDistance(e.minDistance, e.maxDistance), i;
  }
}
re._FrustumCornersNDCSpace = [
  new g(-1, 1, -1),
  new g(1, 1, -1),
  new g(1, -1, -1),
  new g(-1, -1, -1),
  new g(-1, 1, 1),
  new g(1, 1, 1),
  new g(1, -1, 1),
  new g(-1, -1, 1)
];
re.CLASSNAME = "CascadedShadowGenerator";
re.DEFAULT_CASCADES_COUNT = 4;
re.MIN_CASCADES_COUNT = 2;
re.MAX_CASCADES_COUNT = 4;
re._SceneComponentInitialization = (l) => {
  throw pt("ShadowGeneratorSceneComponent");
};
sr.AddParser(Ut.NAME_SHADOWGENERATOR, (l, e) => {
  if (l.shadowGenerators !== void 0 && l.shadowGenerators !== null)
    for (let t = 0, i = l.shadowGenerators.length; t < i; t++) {
      const r = l.shadowGenerators[t];
      r.className === re.CLASSNAME ? re.Parse(r, e) : P.Parse(r, e);
    }
});
class qs {
  /**
   * Creates a new instance of the component for the given scene
   * @param scene Defines the scene to register the component in
   */
  constructor(e) {
    this.name = Ut.NAME_SHADOWGENERATOR, this.scene = e;
  }
  /**
   * Registers the component in a given scene
   */
  register() {
    this.scene._gatherRenderTargetsStage.registerStep(Ut.STEP_GATHERRENDERTARGETS_SHADOWGENERATOR, this, this._gatherRenderTargets);
  }
  /**
   * Rebuilds the elements related to this component in case of
   * context lost for instance.
   */
  rebuild() {
  }
  /**
   * Serializes the component data to the specified json object
   * @param serializationObject The object to serialize to
   */
  serialize(e) {
    e.shadowGenerators = [];
    const t = this.scene.lights;
    for (const i of t) {
      const r = i.getShadowGenerators();
      if (r) {
        const s = r.values();
        for (let n = s.next(); n.done !== !0; n = s.next()) {
          const o = n.value;
          e.shadowGenerators.push(o.serialize());
        }
      }
    }
  }
  /**
   * Adds all the elements from the container to the scene
   * @param container the container holding the elements
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  addFromContainer(e) {
  }
  /**
   * Removes all the elements in the container from the scene
   * @param container contains the elements to remove
   * @param dispose if the removed element should be disposed (default: false)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  removeFromContainer(e, t) {
  }
  /**
   * Rebuilds the elements related to this component in case of
   * context lost for instance.
   */
  dispose() {
  }
  _gatherRenderTargets(e) {
    const t = this.scene;
    if (this.scene.shadowsEnabled)
      for (let i = 0; i < t.lights.length; i++) {
        const r = t.lights[i], s = r.getShadowGenerators();
        if (r.isEnabled() && r.shadowEnabled && s) {
          const n = s.values();
          for (let o = n.next(); o.done !== !0; o = n.next()) {
            const f = o.value.getShadowMap();
            t.textures.indexOf(f) !== -1 && e.push(f);
          }
        }
      }
  }
}
P._SceneComponentInitialization = (l) => {
  let e = l._getComponent(Ut.NAME_SHADOWGENERATOR);
  e || (e = new qs(l), l._addComponent(e));
};
const Js = {
  enableShadows: !0
};
function Si(l = Js) {
  const { enableShadows: e, shadowTransparency: t, intensity: i, scene: r } = l, s = new Ue("DirectionalLight", new g(-0.3, -1, 0.4), r);
  s.position = new g(-50, 65, -50), s.intensity = 0.65 * i;
  const n = new Xt("HemisphericLight", new g(1, 1, 0), r);
  return n.intensity = 0.4 * i, e && (s.shadowMinZ = 1, s.shadowMaxZ = 70, s.shadowGenerator = new P(2048, s), s.shadowGenerator.useCloseExponentialShadowMap = !0, s.shadowGenerator.darkness = t, s.shadowGenerator.transparencyShadow = !0), { directional: s, hemispheric: n };
}
function Vi(l) {
  let t = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23];
  const i = [
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    0,
    -1,
    0,
    0,
    -1,
    0,
    0,
    -1,
    0,
    0,
    -1,
    1,
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    0,
    -1,
    0,
    0,
    -1,
    0,
    0,
    -1,
    0,
    0,
    -1,
    0,
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    0,
    -1,
    0,
    0,
    -1,
    0,
    0,
    -1,
    0,
    0,
    -1,
    0
  ], r = [];
  let s = [];
  const n = l.width || l.size || 1, o = l.height || l.size || 1, a = l.depth || l.size || 1, f = l.wrap || !1;
  let c = l.topBaseAt === void 0 ? 1 : l.topBaseAt, d = l.bottomBaseAt === void 0 ? 0 : l.bottomBaseAt;
  c = (c + 4) % 4, d = (d + 4) % 4;
  const E = [2, 0, 3, 1], u = [2, 0, 1, 3];
  let _ = E[c], p = u[d], A = [
    1,
    -1,
    1,
    -1,
    -1,
    1,
    -1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    -1,
    -1,
    1,
    -1,
    -1,
    -1,
    -1,
    1,
    -1,
    -1,
    1,
    1,
    -1,
    1,
    -1,
    -1,
    1,
    -1,
    1,
    1,
    1,
    1,
    -1,
    1,
    1,
    -1,
    -1,
    1,
    -1,
    -1,
    -1,
    -1,
    1,
    -1,
    -1,
    1,
    1,
    -1,
    1,
    -1,
    1,
    1,
    -1,
    1,
    1,
    1,
    1,
    -1,
    1,
    1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1
  ];
  if (f) {
    t = [2, 3, 0, 2, 0, 1, 4, 5, 6, 4, 6, 7, 9, 10, 11, 9, 11, 8, 12, 14, 15, 12, 13, 14], A = [
      -1,
      1,
      1,
      1,
      1,
      1,
      1,
      -1,
      1,
      -1,
      -1,
      1,
      1,
      1,
      -1,
      -1,
      1,
      -1,
      -1,
      -1,
      -1,
      1,
      -1,
      -1,
      1,
      1,
      1,
      1,
      1,
      -1,
      1,
      -1,
      -1,
      1,
      -1,
      1,
      -1,
      1,
      -1,
      -1,
      1,
      1,
      -1,
      -1,
      1,
      -1,
      -1,
      -1
    ];
    let D = [
      [1, 1, 1],
      [-1, 1, 1],
      [-1, 1, -1],
      [1, 1, -1]
    ], w = [
      [-1, -1, 1],
      [1, -1, 1],
      [1, -1, -1],
      [-1, -1, -1]
    ];
    const X = [17, 18, 19, 16], H = [22, 23, 20, 21];
    for (; _ > 0; )
      D.unshift(D.pop()), X.unshift(X.pop()), _--;
    for (; p > 0; )
      w.unshift(w.pop()), H.unshift(H.pop()), p--;
    D = D.flat(), w = w.flat(), A = A.concat(D).concat(w), t.push(X[0], X[2], X[3], X[0], X[1], X[2]), t.push(H[0], H[2], H[3], H[0], H[1], H[2]);
  }
  const R = [n / 2, o / 2, a / 2];
  s = A.reduce((D, w, X) => D.concat(w * R[X % 3]), []);
  const N = l.sideOrientation === 0 ? 0 : l.sideOrientation || At.DEFAULTSIDE, O = l.faceUV || new Array(6), L = l.faceColors, U = [];
  for (let D = 0; D < 6; D++)
    O[D] === void 0 && (O[D] = new bi(0, 0, 1, 1)), L && L[D] === void 0 && (L[D] = new Et(1, 1, 1, 1));
  for (let D = 0; D < 6; D++)
    if (r.push(O[D].z, ft.UseOpenGLOrientationForUV ? 1 - O[D].w : O[D].w), r.push(O[D].x, ft.UseOpenGLOrientationForUV ? 1 - O[D].w : O[D].w), r.push(O[D].x, ft.UseOpenGLOrientationForUV ? 1 - O[D].y : O[D].y), r.push(O[D].z, ft.UseOpenGLOrientationForUV ? 1 - O[D].y : O[D].y), L)
      for (let w = 0; w < 4; w++)
        U.push(L[D].r, L[D].g, L[D].b, L[D].a);
  At._ComputeSides(N, s, t, i, r, l.frontUVs, l.backUVs);
  const y = new At();
  if (y.indices = t, y.positions = s, y.normals = i, y.uvs = r, L) {
    const D = N === At.DOUBLESIDE ? U.concat(U) : U;
    y.colors = D;
  }
  return y;
}
function lt(l, e = {}, t = null) {
  const i = new St(l, t);
  return e.sideOrientation = St._GetDefaultSideOrientation(e.sideOrientation), i._originalBuilderSideOrientation = e.sideOrientation, Vi(e).applyToMesh(i, e.updatable), i;
}
At.CreateBox = Vi;
St.CreateBox = (l, e, t = null, i, r) => lt(l, {
  size: e,
  sideOrientation: r,
  updatable: i
}, t);
class wt {
  constructor() {
    this.previousWorldMatrices = {}, this.previousBones = {};
  }
  /**
   * Add the required uniforms to the current list.
   * @param uniforms defines the current uniform list.
   */
  static AddUniforms(e) {
    e.push("previousWorld", "previousViewProjection", "mPreviousBones");
  }
  /**
   * Add the required samplers to the current list.
   * @param samplers defines the current sampler list.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static AddSamplers(e) {
  }
  /**
   * Binds the material data.
   * @param effect defines the effect to update
   * @param scene defines the scene the material belongs to.
   * @param mesh The mesh
   * @param world World matrix of this mesh
   * @param isFrozen Is the material frozen
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  bindForSubMesh(e, t, i, r, s) {
    if (t.prePassRenderer && t.prePassRenderer.enabled && t.prePassRenderer.currentRTisSceneRT && t.prePassRenderer.getIndex(2) !== -1) {
      this.previousWorldMatrices[i.uniqueId] || (this.previousWorldMatrices[i.uniqueId] = r.clone()), this.previousViewProjection || (this.previousViewProjection = t.getTransformMatrix().clone(), this.currentViewProjection = t.getTransformMatrix().clone());
      const n = t.getEngine();
      this.currentViewProjection.updateFlag !== t.getTransformMatrix().updateFlag ? (this._lastUpdateFrameId = n.frameId, this.previousViewProjection.copyFrom(this.currentViewProjection), this.currentViewProjection.copyFrom(t.getTransformMatrix())) : this._lastUpdateFrameId !== n.frameId && (this._lastUpdateFrameId = n.frameId, this.previousViewProjection.copyFrom(this.currentViewProjection)), e.setMatrix("previousWorld", this.previousWorldMatrices[i.uniqueId]), e.setMatrix("previousViewProjection", this.previousViewProjection), this.previousWorldMatrices[i.uniqueId] = r.clone();
    }
  }
}
class di extends Ze {
  constructor(e, t, i = !0) {
    super(e, t), this._normalMatrix = new B(), this._storeEffectOnSubMeshes = i;
  }
  getEffect() {
    return this._storeEffectOnSubMeshes ? this._activeEffect : super.getEffect();
  }
  isReady(e, t) {
    return e ? !this._storeEffectOnSubMeshes || !e.subMeshes || e.subMeshes.length === 0 ? !0 : this.isReadyForSubMesh(e, e.subMeshes[0], t) : !1;
  }
  _isReadyForSubMesh(e) {
    const t = e.materialDefines;
    return !!(!this.checkReadyOnEveryCall && e.effect && t && t._renderId === this.getScene().getRenderId());
  }
  /**
   * Binds the given world matrix to the active effect
   *
   * @param world the matrix to bind
   */
  bindOnlyWorldMatrix(e) {
    this._activeEffect.setMatrix("world", e);
  }
  /**
   * Binds the given normal matrix to the active effect
   *
   * @param normalMatrix the matrix to bind
   */
  bindOnlyNormalMatrix(e) {
    this._activeEffect.setMatrix("normalMatrix", e);
  }
  bind(e, t) {
    t && this.bindForSubMesh(e, t, t.subMeshes[0]);
  }
  _afterBind(e, t = null) {
    super._afterBind(e, t), this.getScene()._cachedEffect = t, t && (t._forceRebindOnNextCall = !1);
  }
  _mustRebind(e, t, i = 1) {
    return e.isCachedMaterialInvalid(this, t, i);
  }
  dispose(e, t, i) {
    this._activeEffect = void 0, super.dispose(e, t, i);
  }
}
class S {
  /**
   * Are diffuse textures enabled in the application.
   */
  static get DiffuseTextureEnabled() {
    return this._DiffuseTextureEnabled;
  }
  static set DiffuseTextureEnabled(e) {
    this._DiffuseTextureEnabled !== e && (this._DiffuseTextureEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
  /**
   * Are detail textures enabled in the application.
   */
  static get DetailTextureEnabled() {
    return this._DetailTextureEnabled;
  }
  static set DetailTextureEnabled(e) {
    this._DetailTextureEnabled !== e && (this._DetailTextureEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
  /**
   * Are decal maps enabled in the application.
   */
  static get DecalMapEnabled() {
    return this._DecalMapEnabled;
  }
  static set DecalMapEnabled(e) {
    this._DecalMapEnabled !== e && (this._DecalMapEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
  /**
   * Are ambient textures enabled in the application.
   */
  static get AmbientTextureEnabled() {
    return this._AmbientTextureEnabled;
  }
  static set AmbientTextureEnabled(e) {
    this._AmbientTextureEnabled !== e && (this._AmbientTextureEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
  /**
   * Are opacity textures enabled in the application.
   */
  static get OpacityTextureEnabled() {
    return this._OpacityTextureEnabled;
  }
  static set OpacityTextureEnabled(e) {
    this._OpacityTextureEnabled !== e && (this._OpacityTextureEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
  /**
   * Are reflection textures enabled in the application.
   */
  static get ReflectionTextureEnabled() {
    return this._ReflectionTextureEnabled;
  }
  static set ReflectionTextureEnabled(e) {
    this._ReflectionTextureEnabled !== e && (this._ReflectionTextureEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
  /**
   * Are emissive textures enabled in the application.
   */
  static get EmissiveTextureEnabled() {
    return this._EmissiveTextureEnabled;
  }
  static set EmissiveTextureEnabled(e) {
    this._EmissiveTextureEnabled !== e && (this._EmissiveTextureEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
  /**
   * Are specular textures enabled in the application.
   */
  static get SpecularTextureEnabled() {
    return this._SpecularTextureEnabled;
  }
  static set SpecularTextureEnabled(e) {
    this._SpecularTextureEnabled !== e && (this._SpecularTextureEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
  /**
   * Are bump textures enabled in the application.
   */
  static get BumpTextureEnabled() {
    return this._BumpTextureEnabled;
  }
  static set BumpTextureEnabled(e) {
    this._BumpTextureEnabled !== e && (this._BumpTextureEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
  /**
   * Are lightmap textures enabled in the application.
   */
  static get LightmapTextureEnabled() {
    return this._LightmapTextureEnabled;
  }
  static set LightmapTextureEnabled(e) {
    this._LightmapTextureEnabled !== e && (this._LightmapTextureEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
  /**
   * Are refraction textures enabled in the application.
   */
  static get RefractionTextureEnabled() {
    return this._RefractionTextureEnabled;
  }
  static set RefractionTextureEnabled(e) {
    this._RefractionTextureEnabled !== e && (this._RefractionTextureEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
  /**
   * Are color grading textures enabled in the application.
   */
  static get ColorGradingTextureEnabled() {
    return this._ColorGradingTextureEnabled;
  }
  static set ColorGradingTextureEnabled(e) {
    this._ColorGradingTextureEnabled !== e && (this._ColorGradingTextureEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
  /**
   * Are fresnels enabled in the application.
   */
  static get FresnelEnabled() {
    return this._FresnelEnabled;
  }
  static set FresnelEnabled(e) {
    this._FresnelEnabled !== e && (this._FresnelEnabled = e, Z.MarkAllMaterialsAsDirty(4));
  }
  /**
   * Are clear coat textures enabled in the application.
   */
  static get ClearCoatTextureEnabled() {
    return this._ClearCoatTextureEnabled;
  }
  static set ClearCoatTextureEnabled(e) {
    this._ClearCoatTextureEnabled !== e && (this._ClearCoatTextureEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
  /**
   * Are clear coat bump textures enabled in the application.
   */
  static get ClearCoatBumpTextureEnabled() {
    return this._ClearCoatBumpTextureEnabled;
  }
  static set ClearCoatBumpTextureEnabled(e) {
    this._ClearCoatBumpTextureEnabled !== e && (this._ClearCoatBumpTextureEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
  /**
   * Are clear coat tint textures enabled in the application.
   */
  static get ClearCoatTintTextureEnabled() {
    return this._ClearCoatTintTextureEnabled;
  }
  static set ClearCoatTintTextureEnabled(e) {
    this._ClearCoatTintTextureEnabled !== e && (this._ClearCoatTintTextureEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
  /**
   * Are sheen textures enabled in the application.
   */
  static get SheenTextureEnabled() {
    return this._SheenTextureEnabled;
  }
  static set SheenTextureEnabled(e) {
    this._SheenTextureEnabled !== e && (this._SheenTextureEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
  /**
   * Are anisotropic textures enabled in the application.
   */
  static get AnisotropicTextureEnabled() {
    return this._AnisotropicTextureEnabled;
  }
  static set AnisotropicTextureEnabled(e) {
    this._AnisotropicTextureEnabled !== e && (this._AnisotropicTextureEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
  /**
   * Are thickness textures enabled in the application.
   */
  static get ThicknessTextureEnabled() {
    return this._ThicknessTextureEnabled;
  }
  static set ThicknessTextureEnabled(e) {
    this._ThicknessTextureEnabled !== e && (this._ThicknessTextureEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
  /**
   * Are refraction intensity textures enabled in the application.
   */
  static get RefractionIntensityTextureEnabled() {
    return this._ThicknessTextureEnabled;
  }
  static set RefractionIntensityTextureEnabled(e) {
    this._RefractionIntensityTextureEnabled !== e && (this._RefractionIntensityTextureEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
  /**
   * Are translucency intensity textures enabled in the application.
   */
  static get TranslucencyIntensityTextureEnabled() {
    return this._ThicknessTextureEnabled;
  }
  static set TranslucencyIntensityTextureEnabled(e) {
    this._TranslucencyIntensityTextureEnabled !== e && (this._TranslucencyIntensityTextureEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
  /**
   * Are translucency intensity textures enabled in the application.
   */
  static get IridescenceTextureEnabled() {
    return this._IridescenceTextureEnabled;
  }
  static set IridescenceTextureEnabled(e) {
    this._IridescenceTextureEnabled !== e && (this._IridescenceTextureEnabled = e, Z.MarkAllMaterialsAsDirty(1));
  }
}
S._DiffuseTextureEnabled = !0;
S._DetailTextureEnabled = !0;
S._DecalMapEnabled = !0;
S._AmbientTextureEnabled = !0;
S._OpacityTextureEnabled = !0;
S._ReflectionTextureEnabled = !0;
S._EmissiveTextureEnabled = !0;
S._SpecularTextureEnabled = !0;
S._BumpTextureEnabled = !0;
S._LightmapTextureEnabled = !0;
S._RefractionTextureEnabled = !0;
S._ColorGradingTextureEnabled = !0;
S._FresnelEnabled = !0;
S._ClearCoatTextureEnabled = !0;
S._ClearCoatBumpTextureEnabled = !0;
S._ClearCoatTintTextureEnabled = !0;
S._SheenTextureEnabled = !0;
S._AnisotropicTextureEnabled = !0;
S._ThicknessTextureEnabled = !0;
S._RefractionIntensityTextureEnabled = !0;
S._TranslucencyIntensityTextureEnabled = !0;
S._IridescenceTextureEnabled = !0;
const $s = "decalFragmentDeclaration", en = `#ifdef DECAL
uniform vec4 vDecalInfos;
#endif
`;
C.IncludesShadersStore[$s] = en;
const tn = "defaultFragmentDeclaration", rn = `uniform vec4 vEyePosition;
uniform vec4 vDiffuseColor;
#ifdef SPECULARTERM
uniform vec4 vSpecularColor;
#endif
uniform vec3 vEmissiveColor;
uniform vec3 vAmbientColor;
uniform float visibility;
#ifdef DIFFUSE
uniform vec2 vDiffuseInfos;
#endif
#ifdef AMBIENT
uniform vec2 vAmbientInfos;
#endif
#ifdef OPACITY 
uniform vec2 vOpacityInfos;
#endif
#ifdef EMISSIVE
uniform vec2 vEmissiveInfos;
#endif
#ifdef LIGHTMAP
uniform vec2 vLightmapInfos;
#endif
#ifdef BUMP
uniform vec3 vBumpInfos;
uniform vec2 vTangentSpaceParams;
#endif
#ifdef ALPHATEST
uniform float alphaCutOff;
#endif
#if defined(REFLECTIONMAP_SPHERICAL) || defined(REFLECTIONMAP_PROJECTION) || defined(REFRACTION) || defined(PREPASS)
uniform mat4 view;
#endif
#ifdef REFRACTION
uniform vec4 vRefractionInfos;
#ifndef REFRACTIONMAP_3D
uniform mat4 refractionMatrix;
#endif
#ifdef REFRACTIONFRESNEL
uniform vec4 refractionLeftColor;
uniform vec4 refractionRightColor;
#endif
#if defined(USE_LOCAL_REFRACTIONMAP_CUBIC) && defined(REFRACTIONMAP_3D)
uniform vec3 vRefractionPosition;
uniform vec3 vRefractionSize; 
#endif
#endif
#if defined(SPECULAR) && defined(SPECULARTERM)
uniform vec2 vSpecularInfos;
#endif
#ifdef DIFFUSEFRESNEL
uniform vec4 diffuseLeftColor;
uniform vec4 diffuseRightColor;
#endif
#ifdef OPACITYFRESNEL
uniform vec4 opacityParts;
#endif
#ifdef EMISSIVEFRESNEL
uniform vec4 emissiveLeftColor;
uniform vec4 emissiveRightColor;
#endif
#ifdef REFLECTION
uniform vec2 vReflectionInfos;
#if defined(REFLECTIONMAP_PLANAR) || defined(REFLECTIONMAP_CUBIC) || defined(REFLECTIONMAP_PROJECTION) || defined(REFLECTIONMAP_EQUIRECTANGULAR) || defined(REFLECTIONMAP_SPHERICAL) || defined(REFLECTIONMAP_SKYBOX)
uniform mat4 reflectionMatrix;
#endif
#ifndef REFLECTIONMAP_SKYBOX
#if defined(USE_LOCAL_REFLECTIONMAP_CUBIC) && defined(REFLECTIONMAP_CUBIC)
uniform vec3 vReflectionPosition;
uniform vec3 vReflectionSize; 
#endif
#endif
#ifdef REFLECTIONFRESNEL
uniform vec4 reflectionLeftColor;
uniform vec4 reflectionRightColor;
#endif
#endif
#ifdef DETAIL
uniform vec4 vDetailInfos;
#endif
#include<decalFragmentDeclaration>
#define ADDITIONAL_FRAGMENT_DECLARATION
`;
C.IncludesShadersStore[tn] = rn;
const sn = "defaultUboDeclaration", nn = `layout(std140,column_major) uniform;
uniform Material
{
vec4 diffuseLeftColor;
vec4 diffuseRightColor;
vec4 opacityParts;
vec4 reflectionLeftColor;
vec4 reflectionRightColor;
vec4 refractionLeftColor;
vec4 refractionRightColor;
vec4 emissiveLeftColor;
vec4 emissiveRightColor;
vec2 vDiffuseInfos;
vec2 vAmbientInfos;
vec2 vOpacityInfos;
vec2 vReflectionInfos;
vec3 vReflectionPosition;
vec3 vReflectionSize;
vec2 vEmissiveInfos;
vec2 vLightmapInfos;
vec2 vSpecularInfos;
vec3 vBumpInfos;
mat4 diffuseMatrix;
mat4 ambientMatrix;
mat4 opacityMatrix;
mat4 reflectionMatrix;
mat4 emissiveMatrix;
mat4 lightmapMatrix;
mat4 specularMatrix;
mat4 bumpMatrix;
vec2 vTangentSpaceParams;
float pointSize;
float alphaCutOff;
mat4 refractionMatrix;
vec4 vRefractionInfos;
vec3 vRefractionPosition;
vec3 vRefractionSize;
vec4 vSpecularColor;
vec3 vEmissiveColor;
vec4 vDiffuseColor;
vec3 vAmbientColor;
#define ADDITIONAL_UBO_DECLARATION
};
#include<sceneUboDeclaration>
#include<meshUboDeclaration>
`;
C.IncludesShadersStore[sn] = nn;
const an = "prePassDeclaration", on = `#ifdef PREPASS
#extension GL_EXT_draw_buffers : require
layout(location=0) out highp vec4 glFragData[{X}];highp vec4 gl_FragColor;
#ifdef PREPASS_DEPTH
varying highp vec3 vViewPos;
#endif
#ifdef PREPASS_VELOCITY
varying highp vec4 vCurrentPosition;varying highp vec4 vPreviousPosition;
#endif
#endif
`;
C.IncludesShadersStore[an] = on;
const ln = "oitDeclaration", fn = `#ifdef ORDER_INDEPENDENT_TRANSPARENCY
#extension GL_EXT_draw_buffers : require
layout(location=0) out vec2 depth; 
layout(location=1) out vec4 frontColor;
layout(location=2) out vec4 backColor;
#define MAX_DEPTH 99999.0
highp vec4 gl_FragColor;
uniform sampler2D oitDepthSampler;
uniform sampler2D oitFrontColorSampler;
#endif
`;
C.IncludesShadersStore[ln] = fn;
const cn = "mainUVVaryingDeclaration", dn = `#ifdef MAINUV{X}
varying vec2 vMainUV{X};
#endif
`;
C.IncludesShadersStore[cn] = dn;
const hn = "lightFragmentDeclaration", un = `#ifdef LIGHT{X}
uniform vec4 vLightData{X};
uniform vec4 vLightDiffuse{X};
#ifdef SPECULARTERM
uniform vec4 vLightSpecular{X};
#else
vec4 vLightSpecular{X}=vec4(0.);
#endif
#ifdef SHADOW{X}
#ifdef SHADOWCSM{X}
uniform mat4 lightMatrix{X}[SHADOWCSMNUM_CASCADES{X}];
uniform float viewFrustumZ{X}[SHADOWCSMNUM_CASCADES{X}];
uniform float frustumLengths{X}[SHADOWCSMNUM_CASCADES{X}];
uniform float cascadeBlendFactor{X};
varying vec4 vPositionFromLight{X}[SHADOWCSMNUM_CASCADES{X}];
varying float vDepthMetric{X}[SHADOWCSMNUM_CASCADES{X}];
varying vec4 vPositionFromCamera{X};
#if defined(SHADOWPCSS{X})
uniform highp sampler2DArrayShadow shadowSampler{X};
uniform highp sampler2DArray depthSampler{X};
uniform vec2 lightSizeUVCorrection{X}[SHADOWCSMNUM_CASCADES{X}];
uniform float depthCorrection{X}[SHADOWCSMNUM_CASCADES{X}];
uniform float penumbraDarkness{X};
#elif defined(SHADOWPCF{X})
uniform highp sampler2DArrayShadow shadowSampler{X};
#else
uniform highp sampler2DArray shadowSampler{X};
#endif
#ifdef SHADOWCSMDEBUG{X}
const vec3 vCascadeColorsMultiplier{X}[8]=vec3[8]
(
vec3 ( 1.5,0.0,0.0 ),
vec3 ( 0.0,1.5,0.0 ),
vec3 ( 0.0,0.0,5.5 ),
vec3 ( 1.5,0.0,5.5 ),
vec3 ( 1.5,1.5,0.0 ),
vec3 ( 1.0,1.0,1.0 ),
vec3 ( 0.0,1.0,5.5 ),
vec3 ( 0.5,3.5,0.75 )
);
vec3 shadowDebug{X};
#endif
#ifdef SHADOWCSMUSESHADOWMAXZ{X}
int index{X}=-1;
#else
int index{X}=SHADOWCSMNUM_CASCADES{X}-1;
#endif
float diff{X}=0.;
#elif defined(SHADOWCUBE{X})
uniform samplerCube shadowSampler{X};
#else
varying vec4 vPositionFromLight{X};
varying float vDepthMetric{X};
#if defined(SHADOWPCSS{X})
uniform highp sampler2DShadow shadowSampler{X};
uniform highp sampler2D depthSampler{X};
#elif defined(SHADOWPCF{X})
uniform highp sampler2DShadow shadowSampler{X};
#else
uniform sampler2D shadowSampler{X};
#endif
uniform mat4 lightMatrix{X};
#endif
uniform vec4 shadowsInfo{X};
uniform vec2 depthValues{X};
#endif
#ifdef SPOTLIGHT{X}
uniform vec4 vLightDirection{X};
uniform vec4 vLightFalloff{X};
#elif defined(POINTLIGHT{X})
uniform vec4 vLightFalloff{X};
#elif defined(HEMILIGHT{X})
uniform vec3 vLightGround{X};
#endif
#ifdef PROJECTEDLIGHTTEXTURE{X}
uniform mat4 textureProjectionMatrix{X};
uniform sampler2D projectionLightSampler{X};
#endif
#endif
`;
C.IncludesShadersStore[hn] = un;
const En = "lightUboDeclaration", _n = `#ifdef LIGHT{X}
uniform Light{X}
{
vec4 vLightData;
vec4 vLightDiffuse;
vec4 vLightSpecular;
#ifdef SPOTLIGHT{X}
vec4 vLightDirection;
vec4 vLightFalloff;
#elif defined(POINTLIGHT{X})
vec4 vLightFalloff;
#elif defined(HEMILIGHT{X})
vec3 vLightGround;
#endif
vec4 shadowsInfo;
vec2 depthValues;
} light{X};
#ifdef PROJECTEDLIGHTTEXTURE{X}
uniform mat4 textureProjectionMatrix{X};
uniform sampler2D projectionLightSampler{X};
#endif
#ifdef SHADOW{X}
#ifdef SHADOWCSM{X}
uniform mat4 lightMatrix{X}[SHADOWCSMNUM_CASCADES{X}];
uniform float viewFrustumZ{X}[SHADOWCSMNUM_CASCADES{X}];
uniform float frustumLengths{X}[SHADOWCSMNUM_CASCADES{X}];
uniform float cascadeBlendFactor{X};
varying vec4 vPositionFromLight{X}[SHADOWCSMNUM_CASCADES{X}];
varying float vDepthMetric{X}[SHADOWCSMNUM_CASCADES{X}];
varying vec4 vPositionFromCamera{X};
#if defined(SHADOWPCSS{X})
uniform highp sampler2DArrayShadow shadowSampler{X};
uniform highp sampler2DArray depthSampler{X};
uniform vec2 lightSizeUVCorrection{X}[SHADOWCSMNUM_CASCADES{X}];
uniform float depthCorrection{X}[SHADOWCSMNUM_CASCADES{X}];
uniform float penumbraDarkness{X};
#elif defined(SHADOWPCF{X})
uniform highp sampler2DArrayShadow shadowSampler{X};
#else
uniform highp sampler2DArray shadowSampler{X};
#endif
#ifdef SHADOWCSMDEBUG{X}
const vec3 vCascadeColorsMultiplier{X}[8]=vec3[8]
(
vec3 ( 1.5,0.0,0.0 ),
vec3 ( 0.0,1.5,0.0 ),
vec3 ( 0.0,0.0,5.5 ),
vec3 ( 1.5,0.0,5.5 ),
vec3 ( 1.5,1.5,0.0 ),
vec3 ( 1.0,1.0,1.0 ),
vec3 ( 0.0,1.0,5.5 ),
vec3 ( 0.5,3.5,0.75 )
);
vec3 shadowDebug{X};
#endif
#ifdef SHADOWCSMUSESHADOWMAXZ{X}
int index{X}=-1;
#else
int index{X}=SHADOWCSMNUM_CASCADES{X}-1;
#endif
float diff{X}=0.;
#elif defined(SHADOWCUBE{X})
uniform samplerCube shadowSampler{X}; 
#else
varying vec4 vPositionFromLight{X};
varying float vDepthMetric{X};
#if defined(SHADOWPCSS{X})
uniform highp sampler2DShadow shadowSampler{X};
uniform highp sampler2D depthSampler{X};
#elif defined(SHADOWPCF{X})
uniform highp sampler2DShadow shadowSampler{X};
#else
uniform sampler2D shadowSampler{X};
#endif
uniform mat4 lightMatrix{X};
#endif
#endif
#endif
`;
C.IncludesShadersStore[En] = _n;
const mn = "lightsFragmentFunctions", pn = `struct lightingInfo
{
vec3 diffuse;
#ifdef SPECULARTERM
vec3 specular;
#endif
#ifdef NDOTL
float ndl;
#endif
};
lightingInfo computeLighting(vec3 viewDirectionW,vec3 vNormal,vec4 lightData,vec3 diffuseColor,vec3 specularColor,float range,float glossiness) {
lightingInfo result;
vec3 lightVectorW;
float attenuation=1.0;
if (lightData.w==0.)
{
vec3 direction=lightData.xyz-vPositionW;
attenuation=max(0.,1.0-length(direction)/range);
lightVectorW=normalize(direction);
}
else
{
lightVectorW=normalize(-lightData.xyz);
}
float ndl=max(0.,dot(vNormal,lightVectorW));
#ifdef NDOTL
result.ndl=ndl;
#endif
result.diffuse=ndl*diffuseColor*attenuation;
#ifdef SPECULARTERM
vec3 angleW=normalize(viewDirectionW+lightVectorW);
float specComp=max(0.,dot(vNormal,angleW));
specComp=pow(specComp,max(1.,glossiness));
result.specular=specComp*specularColor*attenuation;
#endif
return result;
}
lightingInfo computeSpotLighting(vec3 viewDirectionW,vec3 vNormal,vec4 lightData,vec4 lightDirection,vec3 diffuseColor,vec3 specularColor,float range,float glossiness) {
lightingInfo result;
vec3 direction=lightData.xyz-vPositionW;
vec3 lightVectorW=normalize(direction);
float attenuation=max(0.,1.0-length(direction)/range);
float cosAngle=max(0.,dot(lightDirection.xyz,-lightVectorW));
if (cosAngle>=lightDirection.w)
{
cosAngle=max(0.,pow(cosAngle,lightData.w));
attenuation*=cosAngle;
float ndl=max(0.,dot(vNormal,lightVectorW));
#ifdef NDOTL
result.ndl=ndl;
#endif
result.diffuse=ndl*diffuseColor*attenuation;
#ifdef SPECULARTERM
vec3 angleW=normalize(viewDirectionW+lightVectorW);
float specComp=max(0.,dot(vNormal,angleW));
specComp=pow(specComp,max(1.,glossiness));
result.specular=specComp*specularColor*attenuation;
#endif
return result;
}
result.diffuse=vec3(0.);
#ifdef SPECULARTERM
result.specular=vec3(0.);
#endif
#ifdef NDOTL
result.ndl=0.;
#endif
return result;
}
lightingInfo computeHemisphericLighting(vec3 viewDirectionW,vec3 vNormal,vec4 lightData,vec3 diffuseColor,vec3 specularColor,vec3 groundColor,float glossiness) {
lightingInfo result;
float ndl=dot(vNormal,lightData.xyz)*0.5+0.5;
#ifdef NDOTL
result.ndl=ndl;
#endif
result.diffuse=mix(groundColor,diffuseColor,ndl);
#ifdef SPECULARTERM
vec3 angleW=normalize(viewDirectionW+lightData.xyz);
float specComp=max(0.,dot(vNormal,angleW));
specComp=pow(specComp,max(1.,glossiness));
result.specular=specComp*specularColor;
#endif
return result;
}
#define inline
vec3 computeProjectionTextureDiffuseLighting(sampler2D projectionLightSampler,mat4 textureProjectionMatrix){
vec4 strq=textureProjectionMatrix*vec4(vPositionW,1.0);
strq/=strq.w;
vec3 textureColor=texture2D(projectionLightSampler,strq.xy).rgb;
return textureColor;
}`;
C.IncludesShadersStore[mn] = pn;
const Tn = "shadowsFragmentFunctions", An = `#ifdef SHADOWS
#if defined(WEBGL2) || defined(WEBGPU) || defined(NATIVE)
#define TEXTUREFUNC(s,c,l) texture2DLodEXT(s,c,l)
#else
#define TEXTUREFUNC(s,c,b) texture2D(s,c,b)
#endif
#ifndef SHADOWFLOAT
float unpack(vec4 color)
{
const vec4 bit_shift=vec4(1.0/(255.0*255.0*255.0),1.0/(255.0*255.0),1.0/255.0,1.0);
return dot(color,bit_shift);
}
#endif
float computeFallOff(float value,vec2 clipSpace,float frustumEdgeFalloff)
{
float mask=smoothstep(1.0-frustumEdgeFalloff,1.00000012,clamp(dot(clipSpace,clipSpace),0.,1.));
return mix(value,1.0,mask);
}
#define inline
float computeShadowCube(vec3 lightPosition,samplerCube shadowSampler,float darkness,vec2 depthValues)
{
vec3 directionToLight=vPositionW-lightPosition;
float depth=length(directionToLight);
depth=(depth+depthValues.x)/(depthValues.y);
depth=clamp(depth,0.,1.0);
directionToLight=normalize(directionToLight);
directionToLight.y=-directionToLight.y;
#ifndef SHADOWFLOAT
float shadow=unpack(textureCube(shadowSampler,directionToLight));
#else
float shadow=textureCube(shadowSampler,directionToLight).x;
#endif
return depth>shadow ? darkness : 1.0;
}
#define inline
float computeShadowWithPoissonSamplingCube(vec3 lightPosition,samplerCube shadowSampler,float mapSize,float darkness,vec2 depthValues)
{
vec3 directionToLight=vPositionW-lightPosition;
float depth=length(directionToLight);
depth=(depth+depthValues.x)/(depthValues.y);
depth=clamp(depth,0.,1.0);
directionToLight=normalize(directionToLight);
directionToLight.y=-directionToLight.y;
float visibility=1.;
vec3 poissonDisk[4];
poissonDisk[0]=vec3(-1.0,1.0,-1.0);
poissonDisk[1]=vec3(1.0,-1.0,-1.0);
poissonDisk[2]=vec3(-1.0,-1.0,-1.0);
poissonDisk[3]=vec3(1.0,-1.0,1.0);
#ifndef SHADOWFLOAT
if (unpack(textureCube(shadowSampler,directionToLight+poissonDisk[0]*mapSize))<depth) visibility-=0.25;
if (unpack(textureCube(shadowSampler,directionToLight+poissonDisk[1]*mapSize))<depth) visibility-=0.25;
if (unpack(textureCube(shadowSampler,directionToLight+poissonDisk[2]*mapSize))<depth) visibility-=0.25;
if (unpack(textureCube(shadowSampler,directionToLight+poissonDisk[3]*mapSize))<depth) visibility-=0.25;
#else
if (textureCube(shadowSampler,directionToLight+poissonDisk[0]*mapSize).x<depth) visibility-=0.25;
if (textureCube(shadowSampler,directionToLight+poissonDisk[1]*mapSize).x<depth) visibility-=0.25;
if (textureCube(shadowSampler,directionToLight+poissonDisk[2]*mapSize).x<depth) visibility-=0.25;
if (textureCube(shadowSampler,directionToLight+poissonDisk[3]*mapSize).x<depth) visibility-=0.25;
#endif
return min(1.0,visibility+darkness);
}
#define inline
float computeShadowWithESMCube(vec3 lightPosition,samplerCube shadowSampler,float darkness,float depthScale,vec2 depthValues)
{
vec3 directionToLight=vPositionW-lightPosition;
float depth=length(directionToLight);
depth=(depth+depthValues.x)/(depthValues.y);
float shadowPixelDepth=clamp(depth,0.,1.0);
directionToLight=normalize(directionToLight);
directionToLight.y=-directionToLight.y;
#ifndef SHADOWFLOAT
float shadowMapSample=unpack(textureCube(shadowSampler,directionToLight));
#else
float shadowMapSample=textureCube(shadowSampler,directionToLight).x;
#endif
float esm=1.0-clamp(exp(min(87.,depthScale*shadowPixelDepth))*shadowMapSample,0.,1.-darkness); 
return esm;
}
#define inline
float computeShadowWithCloseESMCube(vec3 lightPosition,samplerCube shadowSampler,float darkness,float depthScale,vec2 depthValues)
{
vec3 directionToLight=vPositionW-lightPosition;
float depth=length(directionToLight);
depth=(depth+depthValues.x)/(depthValues.y);
float shadowPixelDepth=clamp(depth,0.,1.0);
directionToLight=normalize(directionToLight);
directionToLight.y=-directionToLight.y;
#ifndef SHADOWFLOAT
float shadowMapSample=unpack(textureCube(shadowSampler,directionToLight));
#else
float shadowMapSample=textureCube(shadowSampler,directionToLight).x;
#endif
float esm=clamp(exp(min(87.,-depthScale*(shadowPixelDepth-shadowMapSample))),darkness,1.);
return esm;
}
#if defined(WEBGL2) || defined(WEBGPU) || defined(NATIVE)
#define inline
float computeShadowCSM(float layer,vec4 vPositionFromLight,float depthMetric,highp sampler2DArray shadowSampler,float darkness,float frustumEdgeFalloff)
{
vec3 clipSpace=vPositionFromLight.xyz/vPositionFromLight.w;
vec2 uv=0.5*clipSpace.xy+vec2(0.5);
vec3 uvLayer=vec3(uv.x,uv.y,layer);
float shadowPixelDepth=clamp(depthMetric,0.,1.0);
#ifndef SHADOWFLOAT
float shadow=unpack(texture2D(shadowSampler,uvLayer));
#else
float shadow=texture2D(shadowSampler,uvLayer).x;
#endif
return shadowPixelDepth>shadow ? computeFallOff(darkness,clipSpace.xy,frustumEdgeFalloff) : 1.;
}
#endif
#define inline
float computeShadow(vec4 vPositionFromLight,float depthMetric,sampler2D shadowSampler,float darkness,float frustumEdgeFalloff)
{
vec3 clipSpace=vPositionFromLight.xyz/vPositionFromLight.w;
vec2 uv=0.5*clipSpace.xy+vec2(0.5);
if (uv.x<0. || uv.x>1.0 || uv.y<0. || uv.y>1.0)
{
return 1.0;
}
else
{
float shadowPixelDepth=clamp(depthMetric,0.,1.0);
#ifndef SHADOWFLOAT
float shadow=unpack(TEXTUREFUNC(shadowSampler,uv,0.));
#else
float shadow=TEXTUREFUNC(shadowSampler,uv,0.).x;
#endif
return shadowPixelDepth>shadow ? computeFallOff(darkness,clipSpace.xy,frustumEdgeFalloff) : 1.;
}
}
#define inline
float computeShadowWithPoissonSampling(vec4 vPositionFromLight,float depthMetric,sampler2D shadowSampler,float mapSize,float darkness,float frustumEdgeFalloff)
{
vec3 clipSpace=vPositionFromLight.xyz/vPositionFromLight.w;
vec2 uv=0.5*clipSpace.xy+vec2(0.5);
if (uv.x<0. || uv.x>1.0 || uv.y<0. || uv.y>1.0)
{
return 1.0;
}
else
{
float shadowPixelDepth=clamp(depthMetric,0.,1.0);
float visibility=1.;
vec2 poissonDisk[4];
poissonDisk[0]=vec2(-0.94201624,-0.39906216);
poissonDisk[1]=vec2(0.94558609,-0.76890725);
poissonDisk[2]=vec2(-0.094184101,-0.92938870);
poissonDisk[3]=vec2(0.34495938,0.29387760);
#ifndef SHADOWFLOAT
if (unpack(TEXTUREFUNC(shadowSampler,uv+poissonDisk[0]*mapSize,0.))<shadowPixelDepth) visibility-=0.25;
if (unpack(TEXTUREFUNC(shadowSampler,uv+poissonDisk[1]*mapSize,0.))<shadowPixelDepth) visibility-=0.25;
if (unpack(TEXTUREFUNC(shadowSampler,uv+poissonDisk[2]*mapSize,0.))<shadowPixelDepth) visibility-=0.25;
if (unpack(TEXTUREFUNC(shadowSampler,uv+poissonDisk[3]*mapSize,0.))<shadowPixelDepth) visibility-=0.25;
#else
if (TEXTUREFUNC(shadowSampler,uv+poissonDisk[0]*mapSize,0.).x<shadowPixelDepth) visibility-=0.25;
if (TEXTUREFUNC(shadowSampler,uv+poissonDisk[1]*mapSize,0.).x<shadowPixelDepth) visibility-=0.25;
if (TEXTUREFUNC(shadowSampler,uv+poissonDisk[2]*mapSize,0.).x<shadowPixelDepth) visibility-=0.25;
if (TEXTUREFUNC(shadowSampler,uv+poissonDisk[3]*mapSize,0.).x<shadowPixelDepth) visibility-=0.25;
#endif
return computeFallOff(min(1.0,visibility+darkness),clipSpace.xy,frustumEdgeFalloff);
}
}
#define inline
float computeShadowWithESM(vec4 vPositionFromLight,float depthMetric,sampler2D shadowSampler,float darkness,float depthScale,float frustumEdgeFalloff)
{
vec3 clipSpace=vPositionFromLight.xyz/vPositionFromLight.w;
vec2 uv=0.5*clipSpace.xy+vec2(0.5);
if (uv.x<0. || uv.x>1.0 || uv.y<0. || uv.y>1.0)
{
return 1.0;
}
else
{
float shadowPixelDepth=clamp(depthMetric,0.,1.0);
#ifndef SHADOWFLOAT
float shadowMapSample=unpack(TEXTUREFUNC(shadowSampler,uv,0.));
#else
float shadowMapSample=TEXTUREFUNC(shadowSampler,uv,0.).x;
#endif
float esm=1.0-clamp(exp(min(87.,depthScale*shadowPixelDepth))*shadowMapSample,0.,1.-darkness);
return computeFallOff(esm,clipSpace.xy,frustumEdgeFalloff);
}
}
#define inline
float computeShadowWithCloseESM(vec4 vPositionFromLight,float depthMetric,sampler2D shadowSampler,float darkness,float depthScale,float frustumEdgeFalloff)
{
vec3 clipSpace=vPositionFromLight.xyz/vPositionFromLight.w;
vec2 uv=0.5*clipSpace.xy+vec2(0.5);
if (uv.x<0. || uv.x>1.0 || uv.y<0. || uv.y>1.0)
{
return 1.0;
}
else
{
float shadowPixelDepth=clamp(depthMetric,0.,1.0); 
#ifndef SHADOWFLOAT
float shadowMapSample=unpack(TEXTUREFUNC(shadowSampler,uv,0.));
#else
float shadowMapSample=TEXTUREFUNC(shadowSampler,uv,0.).x;
#endif
float esm=clamp(exp(min(87.,-depthScale*(shadowPixelDepth-shadowMapSample))),darkness,1.);
return computeFallOff(esm,clipSpace.xy,frustumEdgeFalloff);
}
}
#ifdef IS_NDC_HALF_ZRANGE
#define ZINCLIP clipSpace.z
#else
#define ZINCLIP uvDepth.z
#endif
#if defined(WEBGL2) || defined(WEBGPU) || defined(NATIVE)
#define GREATEST_LESS_THAN_ONE 0.99999994
#define inline
float computeShadowWithCSMPCF1(float layer,vec4 vPositionFromLight,float depthMetric,highp sampler2DArrayShadow shadowSampler,float darkness,float frustumEdgeFalloff)
{
vec3 clipSpace=vPositionFromLight.xyz/vPositionFromLight.w;
vec3 uvDepth=vec3(0.5*clipSpace.xyz+vec3(0.5));
uvDepth.z=clamp(ZINCLIP,0.,GREATEST_LESS_THAN_ONE);
vec4 uvDepthLayer=vec4(uvDepth.x,uvDepth.y,layer,uvDepth.z);
float shadow=texture2D(shadowSampler,uvDepthLayer);
shadow=mix(darkness,1.,shadow);
return computeFallOff(shadow,clipSpace.xy,frustumEdgeFalloff);
}
#define inline
float computeShadowWithCSMPCF3(float layer,vec4 vPositionFromLight,float depthMetric,highp sampler2DArrayShadow shadowSampler,vec2 shadowMapSizeAndInverse,float darkness,float frustumEdgeFalloff)
{
vec3 clipSpace=vPositionFromLight.xyz/vPositionFromLight.w;
vec3 uvDepth=vec3(0.5*clipSpace.xyz+vec3(0.5));
uvDepth.z=clamp(ZINCLIP,0.,GREATEST_LESS_THAN_ONE);
vec2 uv=uvDepth.xy*shadowMapSizeAndInverse.x; 
uv+=0.5; 
vec2 st=fract(uv); 
vec2 base_uv=floor(uv)-0.5; 
base_uv*=shadowMapSizeAndInverse.y; 
vec2 uvw0=3.-2.*st;
vec2 uvw1=1.+2.*st;
vec2 u=vec2((2.-st.x)/uvw0.x-1.,st.x/uvw1.x+1.)*shadowMapSizeAndInverse.y;
vec2 v=vec2((2.-st.y)/uvw0.y-1.,st.y/uvw1.y+1.)*shadowMapSizeAndInverse.y;
float shadow=0.;
shadow+=uvw0.x*uvw0.y*texture2D(shadowSampler,vec4(base_uv.xy+vec2(u[0],v[0]),layer,uvDepth.z));
shadow+=uvw1.x*uvw0.y*texture2D(shadowSampler,vec4(base_uv.xy+vec2(u[1],v[0]),layer,uvDepth.z));
shadow+=uvw0.x*uvw1.y*texture2D(shadowSampler,vec4(base_uv.xy+vec2(u[0],v[1]),layer,uvDepth.z));
shadow+=uvw1.x*uvw1.y*texture2D(shadowSampler,vec4(base_uv.xy+vec2(u[1],v[1]),layer,uvDepth.z));
shadow=shadow/16.;
shadow=mix(darkness,1.,shadow);
return computeFallOff(shadow,clipSpace.xy,frustumEdgeFalloff);
}
#define inline
float computeShadowWithCSMPCF5(float layer,vec4 vPositionFromLight,float depthMetric,highp sampler2DArrayShadow shadowSampler,vec2 shadowMapSizeAndInverse,float darkness,float frustumEdgeFalloff)
{
vec3 clipSpace=vPositionFromLight.xyz/vPositionFromLight.w;
vec3 uvDepth=vec3(0.5*clipSpace.xyz+vec3(0.5));
uvDepth.z=clamp(ZINCLIP,0.,GREATEST_LESS_THAN_ONE);
vec2 uv=uvDepth.xy*shadowMapSizeAndInverse.x; 
uv+=0.5; 
vec2 st=fract(uv); 
vec2 base_uv=floor(uv)-0.5; 
base_uv*=shadowMapSizeAndInverse.y; 
vec2 uvw0=4.-3.*st;
vec2 uvw1=vec2(7.);
vec2 uvw2=1.+3.*st;
vec3 u=vec3((3.-2.*st.x)/uvw0.x-2.,(3.+st.x)/uvw1.x,st.x/uvw2.x+2.)*shadowMapSizeAndInverse.y;
vec3 v=vec3((3.-2.*st.y)/uvw0.y-2.,(3.+st.y)/uvw1.y,st.y/uvw2.y+2.)*shadowMapSizeAndInverse.y;
float shadow=0.;
shadow+=uvw0.x*uvw0.y*texture2D(shadowSampler,vec4(base_uv.xy+vec2(u[0],v[0]),layer,uvDepth.z));
shadow+=uvw1.x*uvw0.y*texture2D(shadowSampler,vec4(base_uv.xy+vec2(u[1],v[0]),layer,uvDepth.z));
shadow+=uvw2.x*uvw0.y*texture2D(shadowSampler,vec4(base_uv.xy+vec2(u[2],v[0]),layer,uvDepth.z));
shadow+=uvw0.x*uvw1.y*texture2D(shadowSampler,vec4(base_uv.xy+vec2(u[0],v[1]),layer,uvDepth.z));
shadow+=uvw1.x*uvw1.y*texture2D(shadowSampler,vec4(base_uv.xy+vec2(u[1],v[1]),layer,uvDepth.z));
shadow+=uvw2.x*uvw1.y*texture2D(shadowSampler,vec4(base_uv.xy+vec2(u[2],v[1]),layer,uvDepth.z));
shadow+=uvw0.x*uvw2.y*texture2D(shadowSampler,vec4(base_uv.xy+vec2(u[0],v[2]),layer,uvDepth.z));
shadow+=uvw1.x*uvw2.y*texture2D(shadowSampler,vec4(base_uv.xy+vec2(u[1],v[2]),layer,uvDepth.z));
shadow+=uvw2.x*uvw2.y*texture2D(shadowSampler,vec4(base_uv.xy+vec2(u[2],v[2]),layer,uvDepth.z));
shadow=shadow/144.;
shadow=mix(darkness,1.,shadow);
return computeFallOff(shadow,clipSpace.xy,frustumEdgeFalloff);
}
#define inline
float computeShadowWithPCF1(vec4 vPositionFromLight,float depthMetric,highp sampler2DShadow shadowSampler,float darkness,float frustumEdgeFalloff)
{
if (depthMetric>1.0 || depthMetric<0.0) {
return 1.0;
}
else
{
vec3 clipSpace=vPositionFromLight.xyz/vPositionFromLight.w;
vec3 uvDepth=vec3(0.5*clipSpace.xyz+vec3(0.5));
uvDepth.z=ZINCLIP;
float shadow=TEXTUREFUNC(shadowSampler,uvDepth,0.);
shadow=mix(darkness,1.,shadow);
return computeFallOff(shadow,clipSpace.xy,frustumEdgeFalloff);
}
}
#define inline
float computeShadowWithPCF3(vec4 vPositionFromLight,float depthMetric,highp sampler2DShadow shadowSampler,vec2 shadowMapSizeAndInverse,float darkness,float frustumEdgeFalloff)
{
if (depthMetric>1.0 || depthMetric<0.0) {
return 1.0;
}
else
{
vec3 clipSpace=vPositionFromLight.xyz/vPositionFromLight.w;
vec3 uvDepth=vec3(0.5*clipSpace.xyz+vec3(0.5));
uvDepth.z=ZINCLIP;
vec2 uv=uvDepth.xy*shadowMapSizeAndInverse.x; 
uv+=0.5; 
vec2 st=fract(uv); 
vec2 base_uv=floor(uv)-0.5; 
base_uv*=shadowMapSizeAndInverse.y; 
vec2 uvw0=3.-2.*st;
vec2 uvw1=1.+2.*st;
vec2 u=vec2((2.-st.x)/uvw0.x-1.,st.x/uvw1.x+1.)*shadowMapSizeAndInverse.y;
vec2 v=vec2((2.-st.y)/uvw0.y-1.,st.y/uvw1.y+1.)*shadowMapSizeAndInverse.y;
float shadow=0.;
shadow+=uvw0.x*uvw0.y*TEXTUREFUNC(shadowSampler,vec3(base_uv.xy+vec2(u[0],v[0]),uvDepth.z),0.);
shadow+=uvw1.x*uvw0.y*TEXTUREFUNC(shadowSampler,vec3(base_uv.xy+vec2(u[1],v[0]),uvDepth.z),0.);
shadow+=uvw0.x*uvw1.y*TEXTUREFUNC(shadowSampler,vec3(base_uv.xy+vec2(u[0],v[1]),uvDepth.z),0.);
shadow+=uvw1.x*uvw1.y*TEXTUREFUNC(shadowSampler,vec3(base_uv.xy+vec2(u[1],v[1]),uvDepth.z),0.);
shadow=shadow/16.;
shadow=mix(darkness,1.,shadow);
return computeFallOff(shadow,clipSpace.xy,frustumEdgeFalloff);
}
}
#define inline
float computeShadowWithPCF5(vec4 vPositionFromLight,float depthMetric,highp sampler2DShadow shadowSampler,vec2 shadowMapSizeAndInverse,float darkness,float frustumEdgeFalloff)
{
if (depthMetric>1.0 || depthMetric<0.0) {
return 1.0;
}
else
{
vec3 clipSpace=vPositionFromLight.xyz/vPositionFromLight.w;
vec3 uvDepth=vec3(0.5*clipSpace.xyz+vec3(0.5));
uvDepth.z=ZINCLIP;
vec2 uv=uvDepth.xy*shadowMapSizeAndInverse.x; 
uv+=0.5; 
vec2 st=fract(uv); 
vec2 base_uv=floor(uv)-0.5; 
base_uv*=shadowMapSizeAndInverse.y; 
vec2 uvw0=4.-3.*st;
vec2 uvw1=vec2(7.);
vec2 uvw2=1.+3.*st;
vec3 u=vec3((3.-2.*st.x)/uvw0.x-2.,(3.+st.x)/uvw1.x,st.x/uvw2.x+2.)*shadowMapSizeAndInverse.y;
vec3 v=vec3((3.-2.*st.y)/uvw0.y-2.,(3.+st.y)/uvw1.y,st.y/uvw2.y+2.)*shadowMapSizeAndInverse.y;
float shadow=0.;
shadow+=uvw0.x*uvw0.y*TEXTUREFUNC(shadowSampler,vec3(base_uv.xy+vec2(u[0],v[0]),uvDepth.z),0.);
shadow+=uvw1.x*uvw0.y*TEXTUREFUNC(shadowSampler,vec3(base_uv.xy+vec2(u[1],v[0]),uvDepth.z),0.);
shadow+=uvw2.x*uvw0.y*TEXTUREFUNC(shadowSampler,vec3(base_uv.xy+vec2(u[2],v[0]),uvDepth.z),0.);
shadow+=uvw0.x*uvw1.y*TEXTUREFUNC(shadowSampler,vec3(base_uv.xy+vec2(u[0],v[1]),uvDepth.z),0.);
shadow+=uvw1.x*uvw1.y*TEXTUREFUNC(shadowSampler,vec3(base_uv.xy+vec2(u[1],v[1]),uvDepth.z),0.);
shadow+=uvw2.x*uvw1.y*TEXTUREFUNC(shadowSampler,vec3(base_uv.xy+vec2(u[2],v[1]),uvDepth.z),0.);
shadow+=uvw0.x*uvw2.y*TEXTUREFUNC(shadowSampler,vec3(base_uv.xy+vec2(u[0],v[2]),uvDepth.z),0.);
shadow+=uvw1.x*uvw2.y*TEXTUREFUNC(shadowSampler,vec3(base_uv.xy+vec2(u[1],v[2]),uvDepth.z),0.);
shadow+=uvw2.x*uvw2.y*TEXTUREFUNC(shadowSampler,vec3(base_uv.xy+vec2(u[2],v[2]),uvDepth.z),0.);
shadow=shadow/144.;
shadow=mix(darkness,1.,shadow);
return computeFallOff(shadow,clipSpace.xy,frustumEdgeFalloff);
}
}
const vec3 PoissonSamplers32[64]=vec3[64](
vec3(0.06407013,0.05409927,0.),
vec3(0.7366577,0.5789394,0.),
vec3(-0.6270542,-0.5320278,0.),
vec3(-0.4096107,0.8411095,0.),
vec3(0.6849564,-0.4990818,0.),
vec3(-0.874181,-0.04579735,0.),
vec3(0.9989998,0.0009880066,0.),
vec3(-0.004920578,-0.9151649,0.),
vec3(0.1805763,0.9747483,0.),
vec3(-0.2138451,0.2635818,0.),
vec3(0.109845,0.3884785,0.),
vec3(0.06876755,-0.3581074,0.),
vec3(0.374073,-0.7661266,0.),
vec3(0.3079132,-0.1216763,0.),
vec3(-0.3794335,-0.8271583,0.),
vec3(-0.203878,-0.07715034,0.),
vec3(0.5912697,0.1469799,0.),
vec3(-0.88069,0.3031784,0.),
vec3(0.5040108,0.8283722,0.),
vec3(-0.5844124,0.5494877,0.),
vec3(0.6017799,-0.1726654,0.),
vec3(-0.5554981,0.1559997,0.),
vec3(-0.3016369,-0.3900928,0.),
vec3(-0.5550632,-0.1723762,0.),
vec3(0.925029,0.2995041,0.),
vec3(-0.2473137,0.5538505,0.),
vec3(0.9183037,-0.2862392,0.),
vec3(0.2469421,0.6718712,0.),
vec3(0.3916397,-0.4328209,0.),
vec3(-0.03576927,-0.6220032,0.),
vec3(-0.04661255,0.7995201,0.),
vec3(0.4402924,0.3640312,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.),
vec3(0.,0.,0.)
);
const vec3 PoissonSamplers64[64]=vec3[64](
vec3(-0.613392,0.617481,0.),
vec3(0.170019,-0.040254,0.),
vec3(-0.299417,0.791925,0.),
vec3(0.645680,0.493210,0.),
vec3(-0.651784,0.717887,0.),
vec3(0.421003,0.027070,0.),
vec3(-0.817194,-0.271096,0.),
vec3(-0.705374,-0.668203,0.),
vec3(0.977050,-0.108615,0.),
vec3(0.063326,0.142369,0.),
vec3(0.203528,0.214331,0.),
vec3(-0.667531,0.326090,0.),
vec3(-0.098422,-0.295755,0.),
vec3(-0.885922,0.215369,0.),
vec3(0.566637,0.605213,0.),
vec3(0.039766,-0.396100,0.),
vec3(0.751946,0.453352,0.),
vec3(0.078707,-0.715323,0.),
vec3(-0.075838,-0.529344,0.),
vec3(0.724479,-0.580798,0.),
vec3(0.222999,-0.215125,0.),
vec3(-0.467574,-0.405438,0.),
vec3(-0.248268,-0.814753,0.),
vec3(0.354411,-0.887570,0.),
vec3(0.175817,0.382366,0.),
vec3(0.487472,-0.063082,0.),
vec3(-0.084078,0.898312,0.),
vec3(0.488876,-0.783441,0.),
vec3(0.470016,0.217933,0.),
vec3(-0.696890,-0.549791,0.),
vec3(-0.149693,0.605762,0.),
vec3(0.034211,0.979980,0.),
vec3(0.503098,-0.308878,0.),
vec3(-0.016205,-0.872921,0.),
vec3(0.385784,-0.393902,0.),
vec3(-0.146886,-0.859249,0.),
vec3(0.643361,0.164098,0.),
vec3(0.634388,-0.049471,0.),
vec3(-0.688894,0.007843,0.),
vec3(0.464034,-0.188818,0.),
vec3(-0.440840,0.137486,0.),
vec3(0.364483,0.511704,0.),
vec3(0.034028,0.325968,0.),
vec3(0.099094,-0.308023,0.),
vec3(0.693960,-0.366253,0.),
vec3(0.678884,-0.204688,0.),
vec3(0.001801,0.780328,0.),
vec3(0.145177,-0.898984,0.),
vec3(0.062655,-0.611866,0.),
vec3(0.315226,-0.604297,0.),
vec3(-0.780145,0.486251,0.),
vec3(-0.371868,0.882138,0.),
vec3(0.200476,0.494430,0.),
vec3(-0.494552,-0.711051,0.),
vec3(0.612476,0.705252,0.),
vec3(-0.578845,-0.768792,0.),
vec3(-0.772454,-0.090976,0.),
vec3(0.504440,0.372295,0.),
vec3(0.155736,0.065157,0.),
vec3(0.391522,0.849605,0.),
vec3(-0.620106,-0.328104,0.),
vec3(0.789239,-0.419965,0.),
vec3(-0.545396,0.538133,0.),
vec3(-0.178564,-0.596057,0.)
);
#define inline
float computeShadowWithCSMPCSS(float layer,vec4 vPositionFromLight,float depthMetric,highp sampler2DArray depthSampler,highp sampler2DArrayShadow shadowSampler,float shadowMapSizeInverse,float lightSizeUV,float darkness,float frustumEdgeFalloff,int searchTapCount,int pcfTapCount,vec3[64] poissonSamplers,vec2 lightSizeUVCorrection,float depthCorrection,float penumbraDarkness)
{
vec3 clipSpace=vPositionFromLight.xyz/vPositionFromLight.w;
vec3 uvDepth=vec3(0.5*clipSpace.xyz+vec3(0.5));
uvDepth.z=clamp(ZINCLIP,0.,GREATEST_LESS_THAN_ONE);
vec4 uvDepthLayer=vec4(uvDepth.x,uvDepth.y,layer,uvDepth.z);
float blockerDepth=0.0;
float sumBlockerDepth=0.0;
float numBlocker=0.0;
for (int i=0; i<searchTapCount; i ++) {
blockerDepth=texture2D(depthSampler,vec3(uvDepth.xy+(lightSizeUV*lightSizeUVCorrection*shadowMapSizeInverse*PoissonSamplers32[i].xy),layer)).r;
if (blockerDepth<depthMetric) {
sumBlockerDepth+=blockerDepth;
numBlocker++;
}
}
float avgBlockerDepth=sumBlockerDepth/numBlocker;
float AAOffset=shadowMapSizeInverse*10.;
float penumbraRatio=((depthMetric-avgBlockerDepth)*depthCorrection+AAOffset);
vec4 filterRadius=vec4(penumbraRatio*lightSizeUV*lightSizeUVCorrection*shadowMapSizeInverse,0.,0.);
float random=getRand(vPositionFromLight.xy);
float rotationAngle=random*3.1415926;
vec2 rotationVector=vec2(cos(rotationAngle),sin(rotationAngle));
float shadow=0.;
for (int i=0; i<pcfTapCount; i++) {
vec4 offset=vec4(poissonSamplers[i],0.);
offset=vec4(offset.x*rotationVector.x-offset.y*rotationVector.y,offset.y*rotationVector.x+offset.x*rotationVector.y,0.,0.);
shadow+=texture2D(shadowSampler,uvDepthLayer+offset*filterRadius);
}
shadow/=float(pcfTapCount);
shadow=mix(shadow,1.,min((depthMetric-avgBlockerDepth)*depthCorrection*penumbraDarkness,1.));
shadow=mix(darkness,1.,shadow);
if (numBlocker<1.0) {
return 1.0;
}
else
{
return computeFallOff(shadow,clipSpace.xy,frustumEdgeFalloff);
}
}
#define inline
float computeShadowWithPCSS(vec4 vPositionFromLight,float depthMetric,sampler2D depthSampler,highp sampler2DShadow shadowSampler,float shadowMapSizeInverse,float lightSizeUV,float darkness,float frustumEdgeFalloff,int searchTapCount,int pcfTapCount,vec3[64] poissonSamplers)
{
if (depthMetric>1.0 || depthMetric<0.0) {
return 1.0;
}
else
{
vec3 clipSpace=vPositionFromLight.xyz/vPositionFromLight.w;
vec3 uvDepth=vec3(0.5*clipSpace.xyz+vec3(0.5));
uvDepth.z=ZINCLIP;
float blockerDepth=0.0;
float sumBlockerDepth=0.0;
float numBlocker=0.0;
for (int i=0; i<searchTapCount; i ++) {
blockerDepth=TEXTUREFUNC(depthSampler,uvDepth.xy+(lightSizeUV*shadowMapSizeInverse*PoissonSamplers32[i].xy),0.).r;
if (blockerDepth<depthMetric) {
sumBlockerDepth+=blockerDepth;
numBlocker++;
}
}
if (numBlocker<1.0) {
return 1.0;
}
else
{
float avgBlockerDepth=sumBlockerDepth/numBlocker;
float AAOffset=shadowMapSizeInverse*10.;
float penumbraRatio=((depthMetric-avgBlockerDepth)+AAOffset);
float filterRadius=penumbraRatio*lightSizeUV*shadowMapSizeInverse;
float random=getRand(vPositionFromLight.xy);
float rotationAngle=random*3.1415926;
vec2 rotationVector=vec2(cos(rotationAngle),sin(rotationAngle));
float shadow=0.;
for (int i=0; i<pcfTapCount; i++) {
vec3 offset=poissonSamplers[i];
offset=vec3(offset.x*rotationVector.x-offset.y*rotationVector.y,offset.y*rotationVector.x+offset.x*rotationVector.y,0.);
shadow+=TEXTUREFUNC(shadowSampler,uvDepth+offset*filterRadius,0.);
}
shadow/=float(pcfTapCount);
shadow=mix(shadow,1.,depthMetric-avgBlockerDepth);
shadow=mix(darkness,1.,shadow);
return computeFallOff(shadow,clipSpace.xy,frustumEdgeFalloff);
}
}
}
#define inline
float computeShadowWithPCSS16(vec4 vPositionFromLight,float depthMetric,sampler2D depthSampler,highp sampler2DShadow shadowSampler,float shadowMapSizeInverse,float lightSizeUV,float darkness,float frustumEdgeFalloff)
{
return computeShadowWithPCSS(vPositionFromLight,depthMetric,depthSampler,shadowSampler,shadowMapSizeInverse,lightSizeUV,darkness,frustumEdgeFalloff,16,16,PoissonSamplers32);
}
#define inline
float computeShadowWithPCSS32(vec4 vPositionFromLight,float depthMetric,sampler2D depthSampler,highp sampler2DShadow shadowSampler,float shadowMapSizeInverse,float lightSizeUV,float darkness,float frustumEdgeFalloff)
{
return computeShadowWithPCSS(vPositionFromLight,depthMetric,depthSampler,shadowSampler,shadowMapSizeInverse,lightSizeUV,darkness,frustumEdgeFalloff,16,32,PoissonSamplers32);
}
#define inline
float computeShadowWithPCSS64(vec4 vPositionFromLight,float depthMetric,sampler2D depthSampler,highp sampler2DShadow shadowSampler,float shadowMapSizeInverse,float lightSizeUV,float darkness,float frustumEdgeFalloff)
{
return computeShadowWithPCSS(vPositionFromLight,depthMetric,depthSampler,shadowSampler,shadowMapSizeInverse,lightSizeUV,darkness,frustumEdgeFalloff,32,64,PoissonSamplers64);
}
#define inline
float computeShadowWithCSMPCSS16(float layer,vec4 vPositionFromLight,float depthMetric,highp sampler2DArray depthSampler,highp sampler2DArrayShadow shadowSampler,float shadowMapSizeInverse,float lightSizeUV,float darkness,float frustumEdgeFalloff,vec2 lightSizeUVCorrection,float depthCorrection,float penumbraDarkness)
{
return computeShadowWithCSMPCSS(layer,vPositionFromLight,depthMetric,depthSampler,shadowSampler,shadowMapSizeInverse,lightSizeUV,darkness,frustumEdgeFalloff,16,16,PoissonSamplers32,lightSizeUVCorrection,depthCorrection,penumbraDarkness);
}
#define inline
float computeShadowWithCSMPCSS32(float layer,vec4 vPositionFromLight,float depthMetric,highp sampler2DArray depthSampler,highp sampler2DArrayShadow shadowSampler,float shadowMapSizeInverse,float lightSizeUV,float darkness,float frustumEdgeFalloff,vec2 lightSizeUVCorrection,float depthCorrection,float penumbraDarkness)
{
return computeShadowWithCSMPCSS(layer,vPositionFromLight,depthMetric,depthSampler,shadowSampler,shadowMapSizeInverse,lightSizeUV,darkness,frustumEdgeFalloff,16,32,PoissonSamplers32,lightSizeUVCorrection,depthCorrection,penumbraDarkness);
}
#define inline
float computeShadowWithCSMPCSS64(float layer,vec4 vPositionFromLight,float depthMetric,highp sampler2DArray depthSampler,highp sampler2DArrayShadow shadowSampler,float shadowMapSizeInverse,float lightSizeUV,float darkness,float frustumEdgeFalloff,vec2 lightSizeUVCorrection,float depthCorrection,float penumbraDarkness)
{
return computeShadowWithCSMPCSS(layer,vPositionFromLight,depthMetric,depthSampler,shadowSampler,shadowMapSizeInverse,lightSizeUV,darkness,frustumEdgeFalloff,32,64,PoissonSamplers64,lightSizeUVCorrection,depthCorrection,penumbraDarkness);
}
#endif
#endif
`;
C.IncludesShadersStore[Tn] = An;
const gn = "samplerFragmentDeclaration", Sn = `#ifdef _DEFINENAME_
#if _DEFINENAME_DIRECTUV==1
#define v_VARYINGNAME_UV vMainUV1
#elif _DEFINENAME_DIRECTUV==2
#define v_VARYINGNAME_UV vMainUV2
#elif _DEFINENAME_DIRECTUV==3
#define v_VARYINGNAME_UV vMainUV3
#elif _DEFINENAME_DIRECTUV==4
#define v_VARYINGNAME_UV vMainUV4
#elif _DEFINENAME_DIRECTUV==5
#define v_VARYINGNAME_UV vMainUV5
#elif _DEFINENAME_DIRECTUV==6
#define v_VARYINGNAME_UV vMainUV6
#else
varying vec2 v_VARYINGNAME_UV;
#endif
uniform sampler2D _SAMPLERNAME_Sampler;
#endif
`;
C.IncludesShadersStore[gn] = Sn;
const Rn = "fresnelFunction", Cn = `#ifdef FRESNEL
float computeFresnelTerm(vec3 viewDirection,vec3 worldNormal,float bias,float power)
{
float fresnelTerm=pow(bias+abs(dot(viewDirection,worldNormal)),power);
return clamp(fresnelTerm,0.,1.);
}
#endif
`;
C.IncludesShadersStore[Rn] = Cn;
const vn = "reflectionFunction", In = `vec3 computeFixedEquirectangularCoords(vec4 worldPos,vec3 worldNormal,vec3 direction)
{
float lon=atan(direction.z,direction.x);
float lat=acos(direction.y);
vec2 sphereCoords=vec2(lon,lat)*RECIPROCAL_PI2*2.0;
float s=sphereCoords.x*0.5+0.5;
float t=sphereCoords.y;
return vec3(s,t,0); 
}
vec3 computeMirroredFixedEquirectangularCoords(vec4 worldPos,vec3 worldNormal,vec3 direction)
{
float lon=atan(direction.z,direction.x);
float lat=acos(direction.y);
vec2 sphereCoords=vec2(lon,lat)*RECIPROCAL_PI2*2.0;
float s=sphereCoords.x*0.5+0.5;
float t=sphereCoords.y;
return vec3(1.0-s,t,0); 
}
vec3 computeEquirectangularCoords(vec4 worldPos,vec3 worldNormal,vec3 eyePosition,mat4 reflectionMatrix)
{
vec3 cameraToVertex=normalize(worldPos.xyz-eyePosition);
vec3 r=normalize(reflect(cameraToVertex,worldNormal));
r=vec3(reflectionMatrix*vec4(r,0));
float lon=atan(r.z,r.x);
float lat=acos(r.y);
vec2 sphereCoords=vec2(lon,lat)*RECIPROCAL_PI2*2.0;
float s=sphereCoords.x*0.5+0.5;
float t=sphereCoords.y;
return vec3(s,t,0);
}
vec3 computeSphericalCoords(vec4 worldPos,vec3 worldNormal,mat4 view,mat4 reflectionMatrix)
{
vec3 viewDir=normalize(vec3(view*worldPos));
vec3 viewNormal=normalize(vec3(view*vec4(worldNormal,0.0)));
vec3 r=reflect(viewDir,viewNormal);
r=vec3(reflectionMatrix*vec4(r,0));
r.z=r.z-1.0;
float m=2.0*length(r);
return vec3(r.x/m+0.5,1.0-r.y/m-0.5,0);
}
vec3 computePlanarCoords(vec4 worldPos,vec3 worldNormal,vec3 eyePosition,mat4 reflectionMatrix)
{
vec3 viewDir=worldPos.xyz-eyePosition;
vec3 coords=normalize(reflect(viewDir,worldNormal));
return vec3(reflectionMatrix*vec4(coords,1));
}
vec3 computeCubicCoords(vec4 worldPos,vec3 worldNormal,vec3 eyePosition,mat4 reflectionMatrix)
{
vec3 viewDir=normalize(worldPos.xyz-eyePosition);
vec3 coords=reflect(viewDir,worldNormal);
coords=vec3(reflectionMatrix*vec4(coords,0));
#ifdef INVERTCUBICMAP
coords.y*=-1.0;
#endif
return coords;
}
vec3 computeCubicLocalCoords(vec4 worldPos,vec3 worldNormal,vec3 eyePosition,mat4 reflectionMatrix,vec3 reflectionSize,vec3 reflectionPosition)
{
vec3 viewDir=normalize(worldPos.xyz-eyePosition);
vec3 coords=reflect(viewDir,worldNormal);
coords=parallaxCorrectNormal(worldPos.xyz,coords,reflectionSize,reflectionPosition);
coords=vec3(reflectionMatrix*vec4(coords,0));
#ifdef INVERTCUBICMAP
coords.y*=-1.0;
#endif
return coords;
}
vec3 computeProjectionCoords(vec4 worldPos,mat4 view,mat4 reflectionMatrix)
{
return vec3(reflectionMatrix*(view*worldPos));
}
vec3 computeSkyBoxCoords(vec3 positionW,mat4 reflectionMatrix)
{
return vec3(reflectionMatrix*vec4(positionW,1.));
}
#ifdef REFLECTION
vec3 computeReflectionCoords(vec4 worldPos,vec3 worldNormal)
{
#ifdef REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED
vec3 direction=normalize(vDirectionW);
return computeMirroredFixedEquirectangularCoords(worldPos,worldNormal,direction);
#endif
#ifdef REFLECTIONMAP_EQUIRECTANGULAR_FIXED
vec3 direction=normalize(vDirectionW);
return computeFixedEquirectangularCoords(worldPos,worldNormal,direction);
#endif
#ifdef REFLECTIONMAP_EQUIRECTANGULAR
return computeEquirectangularCoords(worldPos,worldNormal,vEyePosition.xyz,reflectionMatrix);
#endif
#ifdef REFLECTIONMAP_SPHERICAL
return computeSphericalCoords(worldPos,worldNormal,view,reflectionMatrix);
#endif
#ifdef REFLECTIONMAP_PLANAR
return computePlanarCoords(worldPos,worldNormal,vEyePosition.xyz,reflectionMatrix);
#endif
#ifdef REFLECTIONMAP_CUBIC
#ifdef USE_LOCAL_REFLECTIONMAP_CUBIC
return computeCubicLocalCoords(worldPos,worldNormal,vEyePosition.xyz,reflectionMatrix,vReflectionSize,vReflectionPosition);
#else
return computeCubicCoords(worldPos,worldNormal,vEyePosition.xyz,reflectionMatrix);
#endif
#endif
#ifdef REFLECTIONMAP_PROJECTION
return computeProjectionCoords(worldPos,view,reflectionMatrix);
#endif
#ifdef REFLECTIONMAP_SKYBOX
return computeSkyBoxCoords(vPositionUVW,reflectionMatrix);
#endif
#ifdef REFLECTIONMAP_EXPLICIT
return vec3(0,0,0);
#endif
}
#endif
`;
C.IncludesShadersStore[vn] = In;
const Mn = "imageProcessingDeclaration", xn = `#ifdef EXPOSURE
uniform float exposureLinear;
#endif
#ifdef CONTRAST
uniform float contrast;
#endif
#if defined(VIGNETTE) || defined(DITHER)
uniform vec2 vInverseScreenSize;
#endif
#ifdef VIGNETTE
uniform vec4 vignetteSettings1;
uniform vec4 vignetteSettings2;
#endif
#ifdef COLORCURVES
uniform vec4 vCameraColorCurveNegative;
uniform vec4 vCameraColorCurveNeutral;
uniform vec4 vCameraColorCurvePositive;
#endif
#ifdef COLORGRADING
#ifdef COLORGRADING3D
uniform highp sampler3D txColorTransform;
#else
uniform sampler2D txColorTransform;
#endif
uniform vec4 colorTransformSettings;
#endif
#ifdef DITHER
uniform float ditherIntensity;
#endif
`;
C.IncludesShadersStore[Mn] = xn;
const Nn = "imageProcessingFunctions", On = `#if defined(COLORGRADING) && !defined(COLORGRADING3D)
/** 
* Polyfill for SAMPLE_TEXTURE_3D,which is unsupported in WebGL.
* sampler3dSetting.x=textureOffset (0.5/textureSize).
* sampler3dSetting.y=textureSize.
*/
#define inline
vec3 sampleTexture3D(sampler2D colorTransform,vec3 color,vec2 sampler3dSetting)
{
float sliceSize=2.0*sampler3dSetting.x; 
#ifdef SAMPLER3DGREENDEPTH
float sliceContinuous=(color.g-sampler3dSetting.x)*sampler3dSetting.y;
#else
float sliceContinuous=(color.b-sampler3dSetting.x)*sampler3dSetting.y;
#endif
float sliceInteger=floor(sliceContinuous);
float sliceFraction=sliceContinuous-sliceInteger;
#ifdef SAMPLER3DGREENDEPTH
vec2 sliceUV=color.rb;
#else
vec2 sliceUV=color.rg;
#endif
sliceUV.x*=sliceSize;
sliceUV.x+=sliceInteger*sliceSize;
sliceUV=saturate(sliceUV);
vec4 slice0Color=texture2D(colorTransform,sliceUV);
sliceUV.x+=sliceSize;
sliceUV=saturate(sliceUV);
vec4 slice1Color=texture2D(colorTransform,sliceUV);
vec3 result=mix(slice0Color.rgb,slice1Color.rgb,sliceFraction);
#ifdef SAMPLER3DBGRMAP
color.rgb=result.rgb;
#else
color.rgb=result.bgr;
#endif
return color;
}
#endif
#ifdef TONEMAPPING_ACES
const mat3 ACESInputMat=mat3(
vec3(0.59719,0.07600,0.02840),
vec3(0.35458,0.90834,0.13383),
vec3(0.04823,0.01566,0.83777)
);
const mat3 ACESOutputMat=mat3(
vec3( 1.60475,-0.10208,-0.00327),
vec3(-0.53108, 1.10813,-0.07276),
vec3(-0.07367,-0.00605, 1.07602)
);
vec3 RRTAndODTFit(vec3 v)
{
vec3 a=v*(v+0.0245786)-0.000090537;
vec3 b=v*(0.983729*v+0.4329510)+0.238081;
return a/b;
}
vec3 ACESFitted(vec3 color)
{
color=ACESInputMat*color;
color=RRTAndODTFit(color);
color=ACESOutputMat*color;
color=saturate(color);
return color;
}
#endif
#define CUSTOM_IMAGEPROCESSINGFUNCTIONS_DEFINITIONS
vec4 applyImageProcessing(vec4 result) {
#define CUSTOM_IMAGEPROCESSINGFUNCTIONS_UPDATERESULT_ATSTART
#ifdef EXPOSURE
result.rgb*=exposureLinear;
#endif
#ifdef VIGNETTE
vec2 viewportXY=gl_FragCoord.xy*vInverseScreenSize;
viewportXY=viewportXY*2.0-1.0;
vec3 vignetteXY1=vec3(viewportXY*vignetteSettings1.xy+vignetteSettings1.zw,1.0);
float vignetteTerm=dot(vignetteXY1,vignetteXY1);
float vignette=pow(vignetteTerm,vignetteSettings2.w);
vec3 vignetteColor=vignetteSettings2.rgb;
#ifdef VIGNETTEBLENDMODEMULTIPLY
vec3 vignetteColorMultiplier=mix(vignetteColor,vec3(1,1,1),vignette);
result.rgb*=vignetteColorMultiplier;
#endif
#ifdef VIGNETTEBLENDMODEOPAQUE
result.rgb=mix(vignetteColor,result.rgb,vignette);
#endif
#endif
#ifdef TONEMAPPING
#ifdef TONEMAPPING_ACES
result.rgb=ACESFitted(result.rgb);
#else
const float tonemappingCalibration=1.590579;
result.rgb=1.0-exp2(-tonemappingCalibration*result.rgb);
#endif
#endif
result.rgb=toGammaSpace(result.rgb);
result.rgb=saturate(result.rgb);
#ifdef CONTRAST
vec3 resultHighContrast=result.rgb*result.rgb*(3.0-2.0*result.rgb);
if (contrast<1.0) {
result.rgb=mix(vec3(0.5,0.5,0.5),result.rgb,contrast);
} else {
result.rgb=mix(result.rgb,resultHighContrast,contrast-1.0);
}
#endif
#ifdef COLORGRADING
vec3 colorTransformInput=result.rgb*colorTransformSettings.xxx+colorTransformSettings.yyy;
#ifdef COLORGRADING3D
vec3 colorTransformOutput=texture(txColorTransform,colorTransformInput).rgb;
#else
vec3 colorTransformOutput=sampleTexture3D(txColorTransform,colorTransformInput,colorTransformSettings.yz).rgb;
#endif
result.rgb=mix(result.rgb,colorTransformOutput,colorTransformSettings.www);
#endif
#ifdef COLORCURVES
float luma=getLuminance(result.rgb);
vec2 curveMix=clamp(vec2(luma*3.0-1.5,luma*-3.0+1.5),vec2(0.0),vec2(1.0));
vec4 colorCurve=vCameraColorCurveNeutral+curveMix.x*vCameraColorCurvePositive-curveMix.y*vCameraColorCurveNegative;
result.rgb*=colorCurve.rgb;
result.rgb=mix(vec3(luma),result.rgb,colorCurve.a);
#endif
#ifdef DITHER
float rand=getRand(gl_FragCoord.xy*vInverseScreenSize);
float dither=mix(-ditherIntensity,ditherIntensity,rand);
result.rgb=saturate(result.rgb+vec3(dither));
#endif
#define CUSTOM_IMAGEPROCESSINGFUNCTIONS_UPDATERESULT_ATEND
return result;
}`;
C.IncludesShadersStore[Nn] = On;
const Ln = "bumpFragmentMainFunctions", Dn = `#if defined(BUMP) || defined(CLEARCOAT_BUMP) || defined(ANISOTROPIC) || defined(DETAIL)
#if defined(TANGENT) && defined(NORMAL) 
varying mat3 vTBN;
#endif
#ifdef OBJECTSPACE_NORMALMAP
uniform mat4 normalMatrix;
#if defined(WEBGL2) || defined(WEBGPU)
mat4 toNormalMatrix(mat4 wMatrix)
{
mat4 ret=inverse(wMatrix);
ret=transpose(ret);
ret[0][3]=0.;
ret[1][3]=0.;
ret[2][3]=0.;
ret[3]=vec4(0.,0.,0.,1.);
return ret;
}
#else
mat4 toNormalMatrix(mat4 m)
{
float
a00=m[0][0],a01=m[0][1],a02=m[0][2],a03=m[0][3],
a10=m[1][0],a11=m[1][1],a12=m[1][2],a13=m[1][3],
a20=m[2][0],a21=m[2][1],a22=m[2][2],a23=m[2][3],
a30=m[3][0],a31=m[3][1],a32=m[3][2],a33=m[3][3],
b00=a00*a11-a01*a10,
b01=a00*a12-a02*a10,
b02=a00*a13-a03*a10,
b03=a01*a12-a02*a11,
b04=a01*a13-a03*a11,
b05=a02*a13-a03*a12,
b06=a20*a31-a21*a30,
b07=a20*a32-a22*a30,
b08=a20*a33-a23*a30,
b09=a21*a32-a22*a31,
b10=a21*a33-a23*a31,
b11=a22*a33-a23*a32,
det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;
mat4 mi=mat4(
a11*b11-a12*b10+a13*b09,
a02*b10-a01*b11-a03*b09,
a31*b05-a32*b04+a33*b03,
a22*b04-a21*b05-a23*b03,
a12*b08-a10*b11-a13*b07,
a00*b11-a02*b08+a03*b07,
a32*b02-a30*b05-a33*b01,
a20*b05-a22*b02+a23*b01,
a10*b10-a11*b08+a13*b06,
a01*b08-a00*b10-a03*b06,
a30*b04-a31*b02+a33*b00,
a21*b02-a20*b04-a23*b00,
a11*b07-a10*b09-a12*b06,
a00*b09-a01*b07+a02*b06,
a31*b01-a30*b03-a32*b00,
a20*b03-a21*b01+a22*b00)/det;
return mat4(mi[0][0],mi[1][0],mi[2][0],mi[3][0],
mi[0][1],mi[1][1],mi[2][1],mi[3][1],
mi[0][2],mi[1][2],mi[2][2],mi[3][2],
mi[0][3],mi[1][3],mi[2][3],mi[3][3]);
}
#endif
#endif
vec3 perturbNormalBase(mat3 cotangentFrame,vec3 normal,float scale)
{
#ifdef NORMALXYSCALE
normal=normalize(normal*vec3(scale,scale,1.0));
#endif
return normalize(cotangentFrame*normal);
}
vec3 perturbNormal(mat3 cotangentFrame,vec3 textureSample,float scale)
{
return perturbNormalBase(cotangentFrame,textureSample*2.0-1.0,scale);
}
mat3 cotangent_frame(vec3 normal,vec3 p,vec2 uv,vec2 tangentSpaceParams)
{
vec3 dp1=dFdx(p);
vec3 dp2=dFdy(p);
vec2 duv1=dFdx(uv);
vec2 duv2=dFdy(uv);
vec3 dp2perp=cross(dp2,normal);
vec3 dp1perp=cross(normal,dp1);
vec3 tangent=dp2perp*duv1.x+dp1perp*duv2.x;
vec3 bitangent=dp2perp*duv1.y+dp1perp*duv2.y;
tangent*=tangentSpaceParams.x;
bitangent*=tangentSpaceParams.y;
float det=max(dot(tangent,tangent),dot(bitangent,bitangent));
float invmax=det==0.0 ? 0.0 : inversesqrt(det);
return mat3(tangent*invmax,bitangent*invmax,normal);
}
#endif
`;
C.IncludesShadersStore[Ln] = Dn;
const Pn = "bumpFragmentFunctions", bn = `#if defined(BUMP)
#include<samplerFragmentDeclaration>(_DEFINENAME_,BUMP,_VARYINGNAME_,Bump,_SAMPLERNAME_,bump)
#endif
#if defined(DETAIL)
#include<samplerFragmentDeclaration>(_DEFINENAME_,DETAIL,_VARYINGNAME_,Detail,_SAMPLERNAME_,detail)
#endif
#if defined(BUMP) && defined(PARALLAX)
const float minSamples=4.;
const float maxSamples=15.;
const int iMaxSamples=15;
vec2 parallaxOcclusion(vec3 vViewDirCoT,vec3 vNormalCoT,vec2 texCoord,float parallaxScale) {
float parallaxLimit=length(vViewDirCoT.xy)/vViewDirCoT.z;
parallaxLimit*=parallaxScale;
vec2 vOffsetDir=normalize(vViewDirCoT.xy);
vec2 vMaxOffset=vOffsetDir*parallaxLimit;
float numSamples=maxSamples+(dot(vViewDirCoT,vNormalCoT)*(minSamples-maxSamples));
float stepSize=1.0/numSamples;
float currRayHeight=1.0;
vec2 vCurrOffset=vec2(0,0);
vec2 vLastOffset=vec2(0,0);
float lastSampledHeight=1.0;
float currSampledHeight=1.0;
bool keepWorking=true;
for (int i=0; i<iMaxSamples; i++)
{
currSampledHeight=texture2D(bumpSampler,texCoord+vCurrOffset).w;
if (!keepWorking)
{
}
else if (currSampledHeight>currRayHeight)
{
float delta1=currSampledHeight-currRayHeight;
float delta2=(currRayHeight+stepSize)-lastSampledHeight;
float ratio=delta1/(delta1+delta2);
vCurrOffset=(ratio)* vLastOffset+(1.0-ratio)*vCurrOffset;
keepWorking=false;
}
else
{
currRayHeight-=stepSize;
vLastOffset=vCurrOffset;
vCurrOffset+=stepSize*vMaxOffset;
lastSampledHeight=currSampledHeight;
}
}
return vCurrOffset;
}
vec2 parallaxOffset(vec3 viewDir,float heightScale)
{
float height=texture2D(bumpSampler,vBumpUV).w;
vec2 texCoordOffset=heightScale*viewDir.xy*height;
return -texCoordOffset;
}
#endif
`;
C.IncludesShadersStore[Pn] = bn;
const Fn = "logDepthDeclaration", yn = `#ifdef LOGARITHMICDEPTH
uniform float logarithmicDepthConstant;
varying float vFragmentDepth;
#endif
`;
C.IncludesShadersStore[Fn] = yn;
const Un = "fogFragmentDeclaration", wn = `#ifdef FOG
#define FOGMODE_NONE 0.
#define FOGMODE_EXP 1.
#define FOGMODE_EXP2 2.
#define FOGMODE_LINEAR 3.
#define E 2.71828
uniform vec4 vFogInfos;
uniform vec3 vFogColor;
varying vec3 vFogDistance;
float CalcFogFactor()
{
float fogCoeff=1.0;
float fogStart=vFogInfos.y;
float fogEnd=vFogInfos.z;
float fogDensity=vFogInfos.w;
float fogDistance=length(vFogDistance);
if (FOGMODE_LINEAR==vFogInfos.x)
{
fogCoeff=(fogEnd-fogDistance)/(fogEnd-fogStart);
}
else if (FOGMODE_EXP==vFogInfos.x)
{
fogCoeff=1.0/pow(E,fogDistance*fogDensity);
}
else if (FOGMODE_EXP2==vFogInfos.x)
{
fogCoeff=1.0/pow(E,fogDistance*fogDistance*fogDensity*fogDensity);
}
return clamp(fogCoeff,0.0,1.0);
}
#endif
`;
C.IncludesShadersStore[Un] = wn;
const Bn = "bumpFragment", Vn = `vec2 uvOffset=vec2(0.0,0.0);
#if defined(BUMP) || defined(PARALLAX) || defined(DETAIL)
#ifdef NORMALXYSCALE
float normalScale=1.0;
#elif defined(BUMP)
float normalScale=vBumpInfos.y;
#else
float normalScale=1.0;
#endif
#if defined(TANGENT) && defined(NORMAL)
mat3 TBN=vTBN;
#elif defined(BUMP)
vec2 TBNUV=gl_FrontFacing ? vBumpUV : -vBumpUV;
mat3 TBN=cotangent_frame(normalW*normalScale,vPositionW,TBNUV,vTangentSpaceParams);
#else
vec2 TBNUV=gl_FrontFacing ? vDetailUV : -vDetailUV;
mat3 TBN=cotangent_frame(normalW*normalScale,vPositionW,TBNUV,vec2(1.,1.));
#endif
#elif defined(ANISOTROPIC)
#if defined(TANGENT) && defined(NORMAL)
mat3 TBN=vTBN;
#else
vec2 TBNUV=gl_FrontFacing ? vMainUV1 : -vMainUV1;
mat3 TBN=cotangent_frame(normalW,vPositionW,TBNUV,vec2(1.,1.));
#endif
#endif
#ifdef PARALLAX
mat3 invTBN=transposeMat3(TBN);
#ifdef PARALLAXOCCLUSION
uvOffset=parallaxOcclusion(invTBN*-viewDirectionW,invTBN*normalW,vBumpUV,vBumpInfos.z);
#else
uvOffset=parallaxOffset(invTBN*viewDirectionW,vBumpInfos.z);
#endif
#endif
#ifdef DETAIL
vec4 detailColor=texture2D(detailSampler,vDetailUV+uvOffset);
vec2 detailNormalRG=detailColor.wy*2.0-1.0;
float detailNormalB=sqrt(1.-saturate(dot(detailNormalRG,detailNormalRG)));
vec3 detailNormal=vec3(detailNormalRG,detailNormalB);
#endif
#ifdef BUMP
#ifdef OBJECTSPACE_NORMALMAP
#define CUSTOM_FRAGMENT_BUMP_FRAGMENT
normalW=normalize(texture2D(bumpSampler,vBumpUV).xyz *2.0-1.0);
normalW=normalize(mat3(normalMatrix)*normalW);
#elif !defined(DETAIL)
normalW=perturbNormal(TBN,texture2D(bumpSampler,vBumpUV+uvOffset).xyz,vBumpInfos.y);
#else
vec3 bumpNormal=texture2D(bumpSampler,vBumpUV+uvOffset).xyz*2.0-1.0;
#if DETAIL_NORMALBLENDMETHOD==0 
detailNormal.xy*=vDetailInfos.z;
vec3 blendedNormal=normalize(vec3(bumpNormal.xy+detailNormal.xy,bumpNormal.z*detailNormal.z));
#elif DETAIL_NORMALBLENDMETHOD==1 
detailNormal.xy*=vDetailInfos.z;
bumpNormal+=vec3(0.0,0.0,1.0);
detailNormal*=vec3(-1.0,-1.0,1.0);
vec3 blendedNormal=bumpNormal*dot(bumpNormal,detailNormal)/bumpNormal.z-detailNormal;
#endif
normalW=perturbNormalBase(TBN,blendedNormal,vBumpInfos.y);
#endif
#elif defined(DETAIL)
detailNormal.xy*=vDetailInfos.z;
normalW=perturbNormalBase(TBN,detailNormal,vDetailInfos.z);
#endif
`;
C.IncludesShadersStore[Bn] = Vn;
const Gn = "decalFragment", Xn = `#ifdef DECAL
#ifdef GAMMADECAL
decalColor.rgb=toLinearSpace(decalColor.rgb);
#endif
#ifdef DECAL_SMOOTHALPHA
decalColor.a*=decalColor.a;
#endif
surfaceAlbedo.rgb=mix(surfaceAlbedo.rgb,decalColor.rgb,decalColor.a);
#endif
`;
C.IncludesShadersStore[Gn] = Xn;
const Hn = "depthPrePass", kn = `#ifdef DEPTHPREPASS
gl_FragColor=vec4(0.,0.,0.,1.0);
return;
#endif
`;
C.IncludesShadersStore[Hn] = kn;
const zn = "lightFragment", Wn = `#ifdef LIGHT{X}
#if defined(SHADOWONLY) || defined(LIGHTMAP) && defined(LIGHTMAPEXCLUDED{X}) && defined(LIGHTMAPNOSPECULAR{X})
#else
#ifdef PBR
#ifdef SPOTLIGHT{X}
preInfo=computePointAndSpotPreLightingInfo(light{X}.vLightData,viewDirectionW,normalW);
#elif defined(POINTLIGHT{X})
preInfo=computePointAndSpotPreLightingInfo(light{X}.vLightData,viewDirectionW,normalW);
#elif defined(HEMILIGHT{X})
preInfo=computeHemisphericPreLightingInfo(light{X}.vLightData,viewDirectionW,normalW);
#elif defined(DIRLIGHT{X})
preInfo=computeDirectionalPreLightingInfo(light{X}.vLightData,viewDirectionW,normalW);
#endif
preInfo.NdotV=NdotV;
#ifdef SPOTLIGHT{X}
#ifdef LIGHT_FALLOFF_GLTF{X}
preInfo.attenuation=computeDistanceLightFalloff_GLTF(preInfo.lightDistanceSquared,light{X}.vLightFalloff.y);
preInfo.attenuation*=computeDirectionalLightFalloff_GLTF(light{X}.vLightDirection.xyz,preInfo.L,light{X}.vLightFalloff.z,light{X}.vLightFalloff.w);
#elif defined(LIGHT_FALLOFF_PHYSICAL{X})
preInfo.attenuation=computeDistanceLightFalloff_Physical(preInfo.lightDistanceSquared);
preInfo.attenuation*=computeDirectionalLightFalloff_Physical(light{X}.vLightDirection.xyz,preInfo.L,light{X}.vLightDirection.w);
#elif defined(LIGHT_FALLOFF_STANDARD{X})
preInfo.attenuation=computeDistanceLightFalloff_Standard(preInfo.lightOffset,light{X}.vLightFalloff.x);
preInfo.attenuation*=computeDirectionalLightFalloff_Standard(light{X}.vLightDirection.xyz,preInfo.L,light{X}.vLightDirection.w,light{X}.vLightData.w);
#else
preInfo.attenuation=computeDistanceLightFalloff(preInfo.lightOffset,preInfo.lightDistanceSquared,light{X}.vLightFalloff.x,light{X}.vLightFalloff.y);
preInfo.attenuation*=computeDirectionalLightFalloff(light{X}.vLightDirection.xyz,preInfo.L,light{X}.vLightDirection.w,light{X}.vLightData.w,light{X}.vLightFalloff.z,light{X}.vLightFalloff.w);
#endif
#elif defined(POINTLIGHT{X})
#ifdef LIGHT_FALLOFF_GLTF{X}
preInfo.attenuation=computeDistanceLightFalloff_GLTF(preInfo.lightDistanceSquared,light{X}.vLightFalloff.y);
#elif defined(LIGHT_FALLOFF_PHYSICAL{X})
preInfo.attenuation=computeDistanceLightFalloff_Physical(preInfo.lightDistanceSquared);
#elif defined(LIGHT_FALLOFF_STANDARD{X})
preInfo.attenuation=computeDistanceLightFalloff_Standard(preInfo.lightOffset,light{X}.vLightFalloff.x);
#else
preInfo.attenuation=computeDistanceLightFalloff(preInfo.lightOffset,preInfo.lightDistanceSquared,light{X}.vLightFalloff.x,light{X}.vLightFalloff.y);
#endif
#else
preInfo.attenuation=1.0;
#endif
#ifdef HEMILIGHT{X}
preInfo.roughness=roughness;
#else
preInfo.roughness=adjustRoughnessFromLightProperties(roughness,light{X}.vLightSpecular.a,preInfo.lightDistance);
#endif
#ifdef IRIDESCENCE
preInfo.iridescenceIntensity=iridescenceIntensity;
#endif
#ifdef HEMILIGHT{X}
info.diffuse=computeHemisphericDiffuseLighting(preInfo,light{X}.vLightDiffuse.rgb,light{X}.vLightGround);
#elif defined(SS_TRANSLUCENCY)
info.diffuse=computeDiffuseAndTransmittedLighting(preInfo,light{X}.vLightDiffuse.rgb,subSurfaceOut.transmittance);
#else
info.diffuse=computeDiffuseLighting(preInfo,light{X}.vLightDiffuse.rgb);
#endif
#ifdef SPECULARTERM
#ifdef ANISOTROPIC
info.specular=computeAnisotropicSpecularLighting(preInfo,viewDirectionW,normalW,anisotropicOut.anisotropicTangent,anisotropicOut.anisotropicBitangent,anisotropicOut.anisotropy,clearcoatOut.specularEnvironmentR0,specularEnvironmentR90,AARoughnessFactors.x,light{X}.vLightDiffuse.rgb);
#else
info.specular=computeSpecularLighting(preInfo,normalW,clearcoatOut.specularEnvironmentR0,specularEnvironmentR90,AARoughnessFactors.x,light{X}.vLightDiffuse.rgb);
#endif
#endif
#ifdef SHEEN
#ifdef SHEEN_LINKWITHALBEDO
preInfo.roughness=sheenOut.sheenIntensity;
#else
#ifdef HEMILIGHT{X}
preInfo.roughness=sheenOut.sheenRoughness;
#else
preInfo.roughness=adjustRoughnessFromLightProperties(sheenOut.sheenRoughness,light{X}.vLightSpecular.a,preInfo.lightDistance);
#endif
#endif
info.sheen=computeSheenLighting(preInfo,normalW,sheenOut.sheenColor,specularEnvironmentR90,AARoughnessFactors.x,light{X}.vLightDiffuse.rgb);
#endif
#ifdef CLEARCOAT
#ifdef HEMILIGHT{X}
preInfo.roughness=clearcoatOut.clearCoatRoughness;
#else
preInfo.roughness=adjustRoughnessFromLightProperties(clearcoatOut.clearCoatRoughness,light{X}.vLightSpecular.a,preInfo.lightDistance);
#endif
info.clearCoat=computeClearCoatLighting(preInfo,clearcoatOut.clearCoatNormalW,clearcoatOut.clearCoatAARoughnessFactors.x,clearcoatOut.clearCoatIntensity,light{X}.vLightDiffuse.rgb);
#ifdef CLEARCOAT_TINT
absorption=computeClearCoatLightingAbsorption(clearcoatOut.clearCoatNdotVRefract,preInfo.L,clearcoatOut.clearCoatNormalW,clearcoatOut.clearCoatColor,clearcoatOut.clearCoatThickness,clearcoatOut.clearCoatIntensity);
info.diffuse*=absorption;
#ifdef SPECULARTERM
info.specular*=absorption;
#endif
#endif
info.diffuse*=info.clearCoat.w;
#ifdef SPECULARTERM
info.specular*=info.clearCoat.w;
#endif
#ifdef SHEEN
info.sheen*=info.clearCoat.w;
#endif
#endif
#else
#ifdef SPOTLIGHT{X}
info=computeSpotLighting(viewDirectionW,normalW,light{X}.vLightData,light{X}.vLightDirection,light{X}.vLightDiffuse.rgb,light{X}.vLightSpecular.rgb,light{X}.vLightDiffuse.a,glossiness);
#elif defined(HEMILIGHT{X})
info=computeHemisphericLighting(viewDirectionW,normalW,light{X}.vLightData,light{X}.vLightDiffuse.rgb,light{X}.vLightSpecular.rgb,light{X}.vLightGround,glossiness);
#elif defined(POINTLIGHT{X}) || defined(DIRLIGHT{X})
info=computeLighting(viewDirectionW,normalW,light{X}.vLightData,light{X}.vLightDiffuse.rgb,light{X}.vLightSpecular.rgb,light{X}.vLightDiffuse.a,glossiness);
#endif
#endif
#ifdef PROJECTEDLIGHTTEXTURE{X}
info.diffuse*=computeProjectionTextureDiffuseLighting(projectionLightSampler{X},textureProjectionMatrix{X});
#endif
#endif
#ifdef SHADOW{X}
#ifdef SHADOWCSM{X}
for (int i=0; i<SHADOWCSMNUM_CASCADES{X}; i++) 
{
#ifdef SHADOWCSM_RIGHTHANDED{X}
diff{X}=viewFrustumZ{X}[i]+vPositionFromCamera{X}.z;
#else
diff{X}=viewFrustumZ{X}[i]-vPositionFromCamera{X}.z;
#endif
if (diff{X}>=0.) {
index{X}=i;
break;
}
}
#ifdef SHADOWCSMUSESHADOWMAXZ{X}
if (index{X}>=0)
#endif
{
#if defined(SHADOWPCF{X})
#if defined(SHADOWLOWQUALITY{X})
shadow=computeShadowWithCSMPCF1(float(index{X}),vPositionFromLight{X}[index{X}],vDepthMetric{X}[index{X}],shadowSampler{X},light{X}.shadowsInfo.x,light{X}.shadowsInfo.w);
#elif defined(SHADOWMEDIUMQUALITY{X})
shadow=computeShadowWithCSMPCF3(float(index{X}),vPositionFromLight{X}[index{X}],vDepthMetric{X}[index{X}],shadowSampler{X},light{X}.shadowsInfo.yz,light{X}.shadowsInfo.x,light{X}.shadowsInfo.w);
#else
shadow=computeShadowWithCSMPCF5(float(index{X}),vPositionFromLight{X}[index{X}],vDepthMetric{X}[index{X}],shadowSampler{X},light{X}.shadowsInfo.yz,light{X}.shadowsInfo.x,light{X}.shadowsInfo.w);
#endif
#elif defined(SHADOWPCSS{X})
#if defined(SHADOWLOWQUALITY{X})
shadow=computeShadowWithCSMPCSS16(float(index{X}),vPositionFromLight{X}[index{X}],vDepthMetric{X}[index{X}],depthSampler{X},shadowSampler{X},light{X}.shadowsInfo.y,light{X}.shadowsInfo.z,light{X}.shadowsInfo.x,light{X}.shadowsInfo.w,lightSizeUVCorrection{X}[index{X}],depthCorrection{X}[index{X}],penumbraDarkness{X});
#elif defined(SHADOWMEDIUMQUALITY{X})
shadow=computeShadowWithCSMPCSS32(float(index{X}),vPositionFromLight{X}[index{X}],vDepthMetric{X}[index{X}],depthSampler{X},shadowSampler{X},light{X}.shadowsInfo.y,light{X}.shadowsInfo.z,light{X}.shadowsInfo.x,light{X}.shadowsInfo.w,lightSizeUVCorrection{X}[index{X}],depthCorrection{X}[index{X}],penumbraDarkness{X});
#else
shadow=computeShadowWithCSMPCSS64(float(index{X}),vPositionFromLight{X}[index{X}],vDepthMetric{X}[index{X}],depthSampler{X},shadowSampler{X},light{X}.shadowsInfo.y,light{X}.shadowsInfo.z,light{X}.shadowsInfo.x,light{X}.shadowsInfo.w,lightSizeUVCorrection{X}[index{X}],depthCorrection{X}[index{X}],penumbraDarkness{X});
#endif
#else
shadow=computeShadowCSM(float(index{X}),vPositionFromLight{X}[index{X}],vDepthMetric{X}[index{X}],shadowSampler{X},light{X}.shadowsInfo.x,light{X}.shadowsInfo.w);
#endif
#ifdef SHADOWCSMDEBUG{X}
shadowDebug{X}=vec3(shadow)*vCascadeColorsMultiplier{X}[index{X}];
#endif
#ifndef SHADOWCSMNOBLEND{X}
float frustumLength=frustumLengths{X}[index{X}];
float diffRatio=clamp(diff{X}/frustumLength,0.,1.)*cascadeBlendFactor{X};
if (index{X}<(SHADOWCSMNUM_CASCADES{X}-1) && diffRatio<1.)
{
index{X}+=1;
float nextShadow=0.;
#if defined(SHADOWPCF{X})
#if defined(SHADOWLOWQUALITY{X})
nextShadow=computeShadowWithCSMPCF1(float(index{X}),vPositionFromLight{X}[index{X}],vDepthMetric{X}[index{X}],shadowSampler{X},light{X}.shadowsInfo.x,light{X}.shadowsInfo.w);
#elif defined(SHADOWMEDIUMQUALITY{X})
nextShadow=computeShadowWithCSMPCF3(float(index{X}),vPositionFromLight{X}[index{X}],vDepthMetric{X}[index{X}],shadowSampler{X},light{X}.shadowsInfo.yz,light{X}.shadowsInfo.x,light{X}.shadowsInfo.w);
#else
nextShadow=computeShadowWithCSMPCF5(float(index{X}),vPositionFromLight{X}[index{X}],vDepthMetric{X}[index{X}],shadowSampler{X},light{X}.shadowsInfo.yz,light{X}.shadowsInfo.x,light{X}.shadowsInfo.w);
#endif
#elif defined(SHADOWPCSS{X})
#if defined(SHADOWLOWQUALITY{X})
nextShadow=computeShadowWithCSMPCSS16(float(index{X}),vPositionFromLight{X}[index{X}],vDepthMetric{X}[index{X}],depthSampler{X},shadowSampler{X},light{X}.shadowsInfo.y,light{X}.shadowsInfo.z,light{X}.shadowsInfo.x,light{X}.shadowsInfo.w,lightSizeUVCorrection{X}[index{X}],depthCorrection{X}[index{X}],penumbraDarkness{X});
#elif defined(SHADOWMEDIUMQUALITY{X})
nextShadow=computeShadowWithCSMPCSS32(float(index{X}),vPositionFromLight{X}[index{X}],vDepthMetric{X}[index{X}],depthSampler{X},shadowSampler{X},light{X}.shadowsInfo.y,light{X}.shadowsInfo.z,light{X}.shadowsInfo.x,light{X}.shadowsInfo.w,lightSizeUVCorrection{X}[index{X}],depthCorrection{X}[index{X}],penumbraDarkness{X});
#else
nextShadow=computeShadowWithCSMPCSS64(float(index{X}),vPositionFromLight{X}[index{X}],vDepthMetric{X}[index{X}],depthSampler{X},shadowSampler{X},light{X}.shadowsInfo.y,light{X}.shadowsInfo.z,light{X}.shadowsInfo.x,light{X}.shadowsInfo.w,lightSizeUVCorrection{X}[index{X}],depthCorrection{X}[index{X}],penumbraDarkness{X});
#endif
#else
nextShadow=computeShadowCSM(float(index{X}),vPositionFromLight{X}[index{X}],vDepthMetric{X}[index{X}],shadowSampler{X},light{X}.shadowsInfo.x,light{X}.shadowsInfo.w);
#endif
shadow=mix(nextShadow,shadow,diffRatio);
#ifdef SHADOWCSMDEBUG{X}
shadowDebug{X}=mix(vec3(nextShadow)*vCascadeColorsMultiplier{X}[index{X}],shadowDebug{X},diffRatio);
#endif
}
#endif
}
#elif defined(SHADOWCLOSEESM{X})
#if defined(SHADOWCUBE{X})
shadow=computeShadowWithCloseESMCube(light{X}.vLightData.xyz,shadowSampler{X},light{X}.shadowsInfo.x,light{X}.shadowsInfo.z,light{X}.depthValues);
#else
shadow=computeShadowWithCloseESM(vPositionFromLight{X},vDepthMetric{X},shadowSampler{X},light{X}.shadowsInfo.x,light{X}.shadowsInfo.z,light{X}.shadowsInfo.w);
#endif
#elif defined(SHADOWESM{X})
#if defined(SHADOWCUBE{X})
shadow=computeShadowWithESMCube(light{X}.vLightData.xyz,shadowSampler{X},light{X}.shadowsInfo.x,light{X}.shadowsInfo.z,light{X}.depthValues);
#else
shadow=computeShadowWithESM(vPositionFromLight{X},vDepthMetric{X},shadowSampler{X},light{X}.shadowsInfo.x,light{X}.shadowsInfo.z,light{X}.shadowsInfo.w);
#endif
#elif defined(SHADOWPOISSON{X})
#if defined(SHADOWCUBE{X})
shadow=computeShadowWithPoissonSamplingCube(light{X}.vLightData.xyz,shadowSampler{X},light{X}.shadowsInfo.y,light{X}.shadowsInfo.x,light{X}.depthValues);
#else
shadow=computeShadowWithPoissonSampling(vPositionFromLight{X},vDepthMetric{X},shadowSampler{X},light{X}.shadowsInfo.y,light{X}.shadowsInfo.x,light{X}.shadowsInfo.w);
#endif
#elif defined(SHADOWPCF{X})
#if defined(SHADOWLOWQUALITY{X})
shadow=computeShadowWithPCF1(vPositionFromLight{X},vDepthMetric{X},shadowSampler{X},light{X}.shadowsInfo.x,light{X}.shadowsInfo.w);
#elif defined(SHADOWMEDIUMQUALITY{X})
shadow=computeShadowWithPCF3(vPositionFromLight{X},vDepthMetric{X},shadowSampler{X},light{X}.shadowsInfo.yz,light{X}.shadowsInfo.x,light{X}.shadowsInfo.w);
#else
shadow=computeShadowWithPCF5(vPositionFromLight{X},vDepthMetric{X},shadowSampler{X},light{X}.shadowsInfo.yz,light{X}.shadowsInfo.x,light{X}.shadowsInfo.w);
#endif
#elif defined(SHADOWPCSS{X})
#if defined(SHADOWLOWQUALITY{X})
shadow=computeShadowWithPCSS16(vPositionFromLight{X},vDepthMetric{X},depthSampler{X},shadowSampler{X},light{X}.shadowsInfo.y,light{X}.shadowsInfo.z,light{X}.shadowsInfo.x,light{X}.shadowsInfo.w);
#elif defined(SHADOWMEDIUMQUALITY{X})
shadow=computeShadowWithPCSS32(vPositionFromLight{X},vDepthMetric{X},depthSampler{X},shadowSampler{X},light{X}.shadowsInfo.y,light{X}.shadowsInfo.z,light{X}.shadowsInfo.x,light{X}.shadowsInfo.w);
#else
shadow=computeShadowWithPCSS64(vPositionFromLight{X},vDepthMetric{X},depthSampler{X},shadowSampler{X},light{X}.shadowsInfo.y,light{X}.shadowsInfo.z,light{X}.shadowsInfo.x,light{X}.shadowsInfo.w);
#endif
#else
#if defined(SHADOWCUBE{X})
shadow=computeShadowCube(light{X}.vLightData.xyz,shadowSampler{X},light{X}.shadowsInfo.x,light{X}.depthValues);
#else
shadow=computeShadow(vPositionFromLight{X},vDepthMetric{X},shadowSampler{X},light{X}.shadowsInfo.x,light{X}.shadowsInfo.w);
#endif
#endif
#ifdef SHADOWONLY
#ifndef SHADOWINUSE
#define SHADOWINUSE
#endif
globalShadow+=shadow;
shadowLightCount+=1.0;
#endif
#else
shadow=1.;
#endif
#ifndef SHADOWONLY
#ifdef CUSTOMUSERLIGHTING
diffuseBase+=computeCustomDiffuseLighting(info,diffuseBase,shadow);
#ifdef SPECULARTERM
specularBase+=computeCustomSpecularLighting(info,specularBase,shadow);
#endif
#elif defined(LIGHTMAP) && defined(LIGHTMAPEXCLUDED{X})
diffuseBase+=lightmapColor.rgb*shadow;
#ifdef SPECULARTERM
#ifndef LIGHTMAPNOSPECULAR{X}
specularBase+=info.specular*shadow*lightmapColor.rgb;
#endif
#endif
#ifdef CLEARCOAT
#ifndef LIGHTMAPNOSPECULAR{X}
clearCoatBase+=info.clearCoat.rgb*shadow*lightmapColor.rgb;
#endif
#endif
#ifdef SHEEN
#ifndef LIGHTMAPNOSPECULAR{X}
sheenBase+=info.sheen.rgb*shadow;
#endif
#endif
#else
#ifdef SHADOWCSMDEBUG{X}
diffuseBase+=info.diffuse*shadowDebug{X};
#else 
diffuseBase+=info.diffuse*shadow;
#endif
#ifdef SPECULARTERM
specularBase+=info.specular*shadow;
#endif
#ifdef CLEARCOAT
clearCoatBase+=info.clearCoat.rgb*shadow;
#endif
#ifdef SHEEN
sheenBase+=info.sheen.rgb*shadow;
#endif
#endif
#endif
#endif
`;
C.IncludesShadersStore[zn] = Wn;
const Yn = "logDepthFragment", Qn = `#ifdef LOGARITHMICDEPTH
gl_FragDepthEXT=log2(vFragmentDepth)*logarithmicDepthConstant*0.5;
#endif
`;
C.IncludesShadersStore[Yn] = Qn;
const Kn = "fogFragment", Zn = `#ifdef FOG
float fog=CalcFogFactor();
#ifdef PBR
fog=toLinearSpace(fog);
#endif
color.rgb=mix(vFogColor,color.rgb,fog);
#endif
`;
C.IncludesShadersStore[Kn] = Zn;
const jn = "oitFragment", qn = `#ifdef ORDER_INDEPENDENT_TRANSPARENCY
float fragDepth=gl_FragCoord.z; 
#ifdef ORDER_INDEPENDENT_TRANSPARENCY_16BITS
uint halfFloat=packHalf2x16(vec2(fragDepth));
vec2 full=unpackHalf2x16(halfFloat);
fragDepth=full.x;
#endif
ivec2 fragCoord=ivec2(gl_FragCoord.xy);
vec2 lastDepth=texelFetch(oitDepthSampler,fragCoord,0).rg;
vec4 lastFrontColor=texelFetch(oitFrontColorSampler,fragCoord,0);
depth.rg=vec2(-MAX_DEPTH);
frontColor=lastFrontColor;
backColor=vec4(0.0);
#ifdef USE_REVERSE_DEPTHBUFFER
float furthestDepth=-lastDepth.x;
float nearestDepth=lastDepth.y;
#else
float nearestDepth=-lastDepth.x;
float furthestDepth=lastDepth.y;
#endif
float alphaMultiplier=1.0-lastFrontColor.a;
#ifdef USE_REVERSE_DEPTHBUFFER
if (fragDepth>nearestDepth || fragDepth<furthestDepth) {
#else
if (fragDepth<nearestDepth || fragDepth>furthestDepth) {
#endif
return;
}
#ifdef USE_REVERSE_DEPTHBUFFER
if (fragDepth<nearestDepth && fragDepth>furthestDepth) {
#else
if (fragDepth>nearestDepth && fragDepth<furthestDepth) {
#endif
depth.rg=vec2(-fragDepth,fragDepth);
return;
}
#endif
`;
C.IncludesShadersStore[jn] = qn;
const Jn = "defaultPixelShader", $n = `#include<__decl__defaultFragment>
#if defined(BUMP) || !defined(NORMAL)
#extension GL_OES_standard_derivatives : enable
#endif
#include<prePassDeclaration>[SCENE_MRT_COUNT]
#include<oitDeclaration>
#define CUSTOM_FRAGMENT_BEGIN
#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif
#define RECIPROCAL_PI2 0.15915494
varying vec3 vPositionW;
#ifdef NORMAL
varying vec3 vNormalW;
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vec4 vColor;
#endif
#include<mainUVVaryingDeclaration>[1..7]
#include<helperFunctions>
#include<__decl__lightFragment>[0..maxSimultaneousLights]
#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>
#include<samplerFragmentDeclaration>(_DEFINENAME_,DIFFUSE,_VARYINGNAME_,Diffuse,_SAMPLERNAME_,diffuse)
#include<samplerFragmentDeclaration>(_DEFINENAME_,AMBIENT,_VARYINGNAME_,Ambient,_SAMPLERNAME_,ambient)
#include<samplerFragmentDeclaration>(_DEFINENAME_,OPACITY,_VARYINGNAME_,Opacity,_SAMPLERNAME_,opacity)
#include<samplerFragmentDeclaration>(_DEFINENAME_,EMISSIVE,_VARYINGNAME_,Emissive,_SAMPLERNAME_,emissive)
#include<samplerFragmentDeclaration>(_DEFINENAME_,LIGHTMAP,_VARYINGNAME_,Lightmap,_SAMPLERNAME_,lightmap)
#include<samplerFragmentDeclaration>(_DEFINENAME_,DECAL,_VARYINGNAME_,Decal,_SAMPLERNAME_,decal)
#ifdef REFRACTION
#ifdef REFRACTIONMAP_3D
uniform samplerCube refractionCubeSampler;
#else
uniform sampler2D refraction2DSampler;
#endif
#endif
#if defined(SPECULARTERM)
#include<samplerFragmentDeclaration>(_DEFINENAME_,SPECULAR,_VARYINGNAME_,Specular,_SAMPLERNAME_,specular)
#endif
#include<fresnelFunction>
#ifdef REFLECTION
#ifdef REFLECTIONMAP_3D
uniform samplerCube reflectionCubeSampler;
#else
uniform sampler2D reflection2DSampler;
#endif
#ifdef REFLECTIONMAP_SKYBOX
varying vec3 vPositionUVW;
#else
#if defined(REFLECTIONMAP_EQUIRECTANGULAR_FIXED) || defined(REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED)
varying vec3 vDirectionW;
#endif
#endif
#include<reflectionFunction>
#endif
#include<imageProcessingDeclaration>
#include<imageProcessingFunctions>
#include<bumpFragmentMainFunctions>
#include<bumpFragmentFunctions>
#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
vec3 viewDirectionW=normalize(vEyePosition.xyz-vPositionW);
vec4 baseColor=vec4(1.,1.,1.,1.);
vec3 diffuseColor=vDiffuseColor.rgb;
float alpha=vDiffuseColor.a;
#ifdef NORMAL
vec3 normalW=normalize(vNormalW);
#else
vec3 normalW=normalize(-cross(dFdx(vPositionW),dFdy(vPositionW)));
#endif
#include<bumpFragment>
#ifdef TWOSIDEDLIGHTING
normalW=gl_FrontFacing ? normalW : -normalW;
#endif
#ifdef DIFFUSE
baseColor=texture2D(diffuseSampler,vDiffuseUV+uvOffset);
#if defined(ALPHATEST) && !defined(ALPHATEST_AFTERALLALPHACOMPUTATIONS)
if (baseColor.a<alphaCutOff)
discard;
#endif
#ifdef ALPHAFROMDIFFUSE
alpha*=baseColor.a;
#endif
#define CUSTOM_FRAGMENT_UPDATE_ALPHA
baseColor.rgb*=vDiffuseInfos.y;
#endif
#ifdef DECAL
vec4 decalColor=texture2D(decalSampler,vDecalUV+uvOffset);
#include<decalFragment>(surfaceAlbedo,baseColor,GAMMADECAL,_GAMMADECAL_NOTUSED_)
#endif
#include<depthPrePass>
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
baseColor.rgb*=vColor.rgb;
#endif
#ifdef DETAIL
baseColor.rgb=baseColor.rgb*2.0*mix(0.5,detailColor.r,vDetailInfos.y);
#endif
#define CUSTOM_FRAGMENT_UPDATE_DIFFUSE
vec3 baseAmbientColor=vec3(1.,1.,1.);
#ifdef AMBIENT
baseAmbientColor=texture2D(ambientSampler,vAmbientUV+uvOffset).rgb*vAmbientInfos.y;
#endif
#define CUSTOM_FRAGMENT_BEFORE_LIGHTS
#ifdef SPECULARTERM
float glossiness=vSpecularColor.a;
vec3 specularColor=vSpecularColor.rgb;
#ifdef SPECULAR
vec4 specularMapColor=texture2D(specularSampler,vSpecularUV+uvOffset);
specularColor=specularMapColor.rgb;
#ifdef GLOSSINESS
glossiness=glossiness*specularMapColor.a;
#endif
#endif
#else
float glossiness=0.;
#endif
vec3 diffuseBase=vec3(0.,0.,0.);
lightingInfo info;
#ifdef SPECULARTERM
vec3 specularBase=vec3(0.,0.,0.);
#endif
float shadow=1.;
#ifdef LIGHTMAP
vec4 lightmapColor=texture2D(lightmapSampler,vLightmapUV+uvOffset);
#ifdef RGBDLIGHTMAP
lightmapColor.rgb=fromRGBD(lightmapColor);
#endif
lightmapColor.rgb*=vLightmapInfos.y;
#endif
#include<lightFragment>[0..maxSimultaneousLights]
vec4 refractionColor=vec4(0.,0.,0.,1.);
#ifdef REFRACTION
vec3 refractionVector=normalize(refract(-viewDirectionW,normalW,vRefractionInfos.y));
#ifdef REFRACTIONMAP_3D
#ifdef USE_LOCAL_REFRACTIONMAP_CUBIC
refractionVector=parallaxCorrectNormal(vPositionW,refractionVector,vRefractionSize,vRefractionPosition);
#endif
refractionVector.y=refractionVector.y*vRefractionInfos.w;
vec4 refractionLookup=textureCube(refractionCubeSampler,refractionVector);
if (dot(refractionVector,viewDirectionW)<1.0) {
refractionColor=refractionLookup;
}
#else
vec3 vRefractionUVW=vec3(refractionMatrix*(view*vec4(vPositionW+refractionVector*vRefractionInfos.z,1.0)));
vec2 refractionCoords=vRefractionUVW.xy/vRefractionUVW.z;
refractionCoords.y=1.0-refractionCoords.y;
refractionColor=texture2D(refraction2DSampler,refractionCoords);
#endif
#ifdef RGBDREFRACTION
refractionColor.rgb=fromRGBD(refractionColor);
#endif
#ifdef IS_REFRACTION_LINEAR
refractionColor.rgb=toGammaSpace(refractionColor.rgb);
#endif
refractionColor.rgb*=vRefractionInfos.x;
#endif
vec4 reflectionColor=vec4(0.,0.,0.,1.);
#ifdef REFLECTION
vec3 vReflectionUVW=computeReflectionCoords(vec4(vPositionW,1.0),normalW);
#ifdef REFLECTIONMAP_OPPOSITEZ
vReflectionUVW.z*=-1.0;
#endif
#ifdef REFLECTIONMAP_3D
#ifdef ROUGHNESS
float bias=vReflectionInfos.y;
#ifdef SPECULARTERM
#ifdef SPECULAR
#ifdef GLOSSINESS
bias*=(1.0-specularMapColor.a);
#endif
#endif
#endif
reflectionColor=textureCube(reflectionCubeSampler,vReflectionUVW,bias);
#else
reflectionColor=textureCube(reflectionCubeSampler,vReflectionUVW);
#endif
#else
vec2 coords=vReflectionUVW.xy;
#ifdef REFLECTIONMAP_PROJECTION
coords/=vReflectionUVW.z;
#endif
coords.y=1.0-coords.y;
reflectionColor=texture2D(reflection2DSampler,coords);
#endif
#ifdef RGBDREFLECTION
reflectionColor.rgb=fromRGBD(reflectionColor);
#endif
#ifdef IS_REFLECTION_LINEAR
reflectionColor.rgb=toGammaSpace(reflectionColor.rgb);
#endif
reflectionColor.rgb*=vReflectionInfos.x;
#ifdef REFLECTIONFRESNEL
float reflectionFresnelTerm=computeFresnelTerm(viewDirectionW,normalW,reflectionRightColor.a,reflectionLeftColor.a);
#ifdef REFLECTIONFRESNELFROMSPECULAR
#ifdef SPECULARTERM
reflectionColor.rgb*=specularColor.rgb*(1.0-reflectionFresnelTerm)+reflectionFresnelTerm*reflectionRightColor.rgb;
#else
reflectionColor.rgb*=reflectionLeftColor.rgb*(1.0-reflectionFresnelTerm)+reflectionFresnelTerm*reflectionRightColor.rgb;
#endif
#else
reflectionColor.rgb*=reflectionLeftColor.rgb*(1.0-reflectionFresnelTerm)+reflectionFresnelTerm*reflectionRightColor.rgb;
#endif
#endif
#endif
#ifdef REFRACTIONFRESNEL
float refractionFresnelTerm=computeFresnelTerm(viewDirectionW,normalW,refractionRightColor.a,refractionLeftColor.a);
refractionColor.rgb*=refractionLeftColor.rgb*(1.0-refractionFresnelTerm)+refractionFresnelTerm*refractionRightColor.rgb;
#endif
#ifdef OPACITY
vec4 opacityMap=texture2D(opacitySampler,vOpacityUV+uvOffset);
#ifdef OPACITYRGB
opacityMap.rgb=opacityMap.rgb*vec3(0.3,0.59,0.11);
alpha*=(opacityMap.x+opacityMap.y+opacityMap.z)* vOpacityInfos.y;
#else
alpha*=opacityMap.a*vOpacityInfos.y;
#endif
#endif
#if defined(VERTEXALPHA) || defined(INSTANCESCOLOR) && defined(INSTANCES)
alpha*=vColor.a;
#endif
#ifdef OPACITYFRESNEL
float opacityFresnelTerm=computeFresnelTerm(viewDirectionW,normalW,opacityParts.z,opacityParts.w);
alpha+=opacityParts.x*(1.0-opacityFresnelTerm)+opacityFresnelTerm*opacityParts.y;
#endif
#ifdef ALPHATEST
#ifdef ALPHATEST_AFTERALLALPHACOMPUTATIONS
if (alpha<alphaCutOff)
discard;
#endif
#ifndef ALPHABLEND
alpha=1.0;
#endif
#endif
vec3 emissiveColor=vEmissiveColor;
#ifdef EMISSIVE
emissiveColor+=texture2D(emissiveSampler,vEmissiveUV+uvOffset).rgb*vEmissiveInfos.y;
#endif
#ifdef EMISSIVEFRESNEL
float emissiveFresnelTerm=computeFresnelTerm(viewDirectionW,normalW,emissiveRightColor.a,emissiveLeftColor.a);
emissiveColor*=emissiveLeftColor.rgb*(1.0-emissiveFresnelTerm)+emissiveFresnelTerm*emissiveRightColor.rgb;
#endif
#ifdef DIFFUSEFRESNEL
float diffuseFresnelTerm=computeFresnelTerm(viewDirectionW,normalW,diffuseRightColor.a,diffuseLeftColor.a);
diffuseBase*=diffuseLeftColor.rgb*(1.0-diffuseFresnelTerm)+diffuseFresnelTerm*diffuseRightColor.rgb;
#endif
#ifdef EMISSIVEASILLUMINATION
vec3 finalDiffuse=clamp(diffuseBase*diffuseColor+vAmbientColor,0.0,1.0)*baseColor.rgb;
#else
#ifdef LINKEMISSIVEWITHDIFFUSE
vec3 finalDiffuse=clamp((diffuseBase+emissiveColor)*diffuseColor+vAmbientColor,0.0,1.0)*baseColor.rgb;
#else
vec3 finalDiffuse=clamp(diffuseBase*diffuseColor+emissiveColor+vAmbientColor,0.0,1.0)*baseColor.rgb;
#endif
#endif
#ifdef SPECULARTERM
vec3 finalSpecular=specularBase*specularColor;
#ifdef SPECULAROVERALPHA
alpha=clamp(alpha+dot(finalSpecular,vec3(0.3,0.59,0.11)),0.,1.);
#endif
#else
vec3 finalSpecular=vec3(0.0);
#endif
#ifdef REFLECTIONOVERALPHA
alpha=clamp(alpha+dot(reflectionColor.rgb,vec3(0.3,0.59,0.11)),0.,1.);
#endif
#ifdef EMISSIVEASILLUMINATION
vec4 color=vec4(clamp(finalDiffuse*baseAmbientColor+finalSpecular+reflectionColor.rgb+emissiveColor+refractionColor.rgb,0.0,1.0),alpha);
#else
vec4 color=vec4(finalDiffuse*baseAmbientColor+finalSpecular+reflectionColor.rgb+refractionColor.rgb,alpha);
#endif
#ifdef LIGHTMAP
#ifndef LIGHTMAPEXCLUDED
#ifdef USELIGHTMAPASSHADOWMAP
color.rgb*=lightmapColor.rgb;
#else
color.rgb+=lightmapColor.rgb;
#endif
#endif
#endif
#define CUSTOM_FRAGMENT_BEFORE_FOG
color.rgb=max(color.rgb,0.);
#include<logDepthFragment>
#include<fogFragment>
#ifdef IMAGEPROCESSINGPOSTPROCESS
color.rgb=toLinearSpace(color.rgb);
#else
#ifdef IMAGEPROCESSING
color.rgb=toLinearSpace(color.rgb);
color=applyImageProcessing(color);
#endif
#endif
color.a*=visibility;
#ifdef PREMULTIPLYALPHA
color.rgb*=color.a;
#endif
#define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR
#ifdef PREPASS
float writeGeometryInfo=color.a>0.4 ? 1.0 : 0.0;
gl_FragData[0]=color; 
#ifdef PREPASS_POSITION
gl_FragData[PREPASS_POSITION_INDEX]=vec4(vPositionW,writeGeometryInfo);
#endif
#ifdef PREPASS_VELOCITY
vec2 a=(vCurrentPosition.xy/vCurrentPosition.w)*0.5+0.5;
vec2 b=(vPreviousPosition.xy/vPreviousPosition.w)*0.5+0.5;
vec2 velocity=abs(a-b);
velocity=vec2(pow(velocity.x,1.0/3.0),pow(velocity.y,1.0/3.0))*sign(a-b)*0.5+0.5;
gl_FragData[PREPASS_VELOCITY_INDEX]=vec4(velocity,0.0,writeGeometryInfo);
#endif
#ifdef PREPASS_IRRADIANCE
gl_FragData[PREPASS_IRRADIANCE_INDEX]=vec4(0.0,0.0,0.0,writeGeometryInfo); 
#endif
#ifdef PREPASS_DEPTH
gl_FragData[PREPASS_DEPTH_INDEX]=vec4(vViewPos.z,0.0,0.0,writeGeometryInfo); 
#endif
#ifdef PREPASS_NORMAL
gl_FragData[PREPASS_NORMAL_INDEX]=vec4(normalize((view*vec4(normalW,0.0)).rgb),writeGeometryInfo); 
#endif
#ifdef PREPASS_ALBEDO_SQRT
gl_FragData[PREPASS_ALBEDO_SQRT_INDEX]=vec4(0.0,0.0,0.0,writeGeometryInfo); 
#endif
#ifdef PREPASS_REFLECTIVITY
#if defined(SPECULARTERM)
#if defined(SPECULAR)
gl_FragData[PREPASS_REFLECTIVITY_INDEX]=vec4(toLinearSpace(specularMapColor))*writeGeometryInfo; 
#else
gl_FragData[PREPASS_REFLECTIVITY_INDEX]=vec4(toLinearSpace(specularColor),1.0)*writeGeometryInfo;
#endif
#else
gl_FragData[PREPASS_REFLECTIVITY_INDEX]=vec4(0.0,0.0,0.0,1.0)*writeGeometryInfo;
#endif
#endif
#endif
#if !defined(PREPASS) || defined(WEBGL2)
gl_FragColor=color;
#endif
#include<oitFragment>
#if ORDER_INDEPENDENT_TRANSPARENCY
if (fragDepth==nearestDepth) {
frontColor.rgb+=color.rgb*color.a*alphaMultiplier;
frontColor.a=1.0-alphaMultiplier*(1.0-color.a);
} else {
backColor+=color;
}
#endif
#define CUSTOM_FRAGMENT_MAIN_END
}
`;
C.ShadersStore[Jn] = $n;
const ea = "decalVertexDeclaration", ta = `#ifdef DECAL
uniform vec4 vDecalInfos;
uniform mat4 decalMatrix;
#endif
`;
C.IncludesShadersStore[ea] = ta;
const ia = "defaultVertexDeclaration", ra = `uniform mat4 viewProjection;
uniform mat4 view;
#ifdef DIFFUSE
uniform mat4 diffuseMatrix;
uniform vec2 vDiffuseInfos;
#endif
#ifdef AMBIENT
uniform mat4 ambientMatrix;
uniform vec2 vAmbientInfos;
#endif
#ifdef OPACITY
uniform mat4 opacityMatrix;
uniform vec2 vOpacityInfos;
#endif
#ifdef EMISSIVE
uniform vec2 vEmissiveInfos;
uniform mat4 emissiveMatrix;
#endif
#ifdef LIGHTMAP
uniform vec2 vLightmapInfos;
uniform mat4 lightmapMatrix;
#endif
#if defined(SPECULAR) && defined(SPECULARTERM)
uniform vec2 vSpecularInfos;
uniform mat4 specularMatrix;
#endif
#ifdef BUMP
uniform vec3 vBumpInfos;
uniform mat4 bumpMatrix;
#endif
#ifdef REFLECTION
uniform mat4 reflectionMatrix;
#endif
#ifdef POINTSIZE
uniform float pointSize;
#endif
#ifdef DETAIL
uniform vec4 vDetailInfos;
uniform mat4 detailMatrix;
#endif
#include<decalVertexDeclaration>
#define ADDITIONAL_VERTEX_DECLARATION
`;
C.IncludesShadersStore[ia] = ra;
const sa = "uvAttributeDeclaration", na = `#ifdef UV{X}
attribute vec2 uv{X};
#endif
`;
C.IncludesShadersStore[sa] = na;
const aa = "prePassVertexDeclaration", oa = `#ifdef PREPASS
#ifdef PREPASS_DEPTH
varying vec3 vViewPos;
#endif
#ifdef PREPASS_VELOCITY
uniform mat4 previousViewProjection;
varying vec4 vCurrentPosition;
varying vec4 vPreviousPosition;
#endif
#endif
`;
C.IncludesShadersStore[aa] = oa;
const la = "samplerVertexDeclaration", fa = `#if defined(_DEFINENAME_) && _DEFINENAME_DIRECTUV==0
varying vec2 v_VARYINGNAME_UV;
#endif
`;
C.IncludesShadersStore[la] = fa;
const ca = "bumpVertexDeclaration", da = `#if defined(BUMP) || defined(PARALLAX) || defined(CLEARCOAT_BUMP) || defined(ANISOTROPIC)
#if defined(TANGENT) && defined(NORMAL) 
varying mat3 vTBN;
#endif
#endif
`;
C.IncludesShadersStore[ca] = da;
const ha = "fogVertexDeclaration", ua = `#ifdef FOG
varying vec3 vFogDistance;
#endif
`;
C.IncludesShadersStore[ha] = ua;
const Ea = "lightVxFragmentDeclaration", _a = `#ifdef LIGHT{X}
uniform vec4 vLightData{X};
uniform vec4 vLightDiffuse{X};
#ifdef SPECULARTERM
uniform vec4 vLightSpecular{X};
#else
vec4 vLightSpecular{X}=vec4(0.);
#endif
#ifdef SHADOW{X}
#ifdef SHADOWCSM{X}
uniform mat4 lightMatrix{X}[SHADOWCSMNUM_CASCADES{X}];
varying vec4 vPositionFromLight{X}[SHADOWCSMNUM_CASCADES{X}];
varying float vDepthMetric{X}[SHADOWCSMNUM_CASCADES{X}];
varying vec4 vPositionFromCamera{X};
#elif defined(SHADOWCUBE{X})
#else
varying vec4 vPositionFromLight{X};
varying float vDepthMetric{X};
uniform mat4 lightMatrix{X};
#endif
uniform vec4 shadowsInfo{X};
uniform vec2 depthValues{X};
#endif
#ifdef SPOTLIGHT{X}
uniform vec4 vLightDirection{X};
uniform vec4 vLightFalloff{X};
#elif defined(POINTLIGHT{X})
uniform vec4 vLightFalloff{X};
#elif defined(HEMILIGHT{X})
uniform vec3 vLightGround{X};
#endif
#endif
`;
C.IncludesShadersStore[Ea] = _a;
const ma = "lightVxUboDeclaration", pa = `#ifdef LIGHT{X}
uniform Light{X}
{
vec4 vLightData;
vec4 vLightDiffuse;
vec4 vLightSpecular;
#ifdef SPOTLIGHT{X}
vec4 vLightDirection;
vec4 vLightFalloff;
#elif defined(POINTLIGHT{X})
vec4 vLightFalloff;
#elif defined(HEMILIGHT{X})
vec3 vLightGround;
#endif
vec4 shadowsInfo;
vec2 depthValues;
} light{X};
#ifdef SHADOW{X}
#ifdef SHADOWCSM{X}
uniform mat4 lightMatrix{X}[SHADOWCSMNUM_CASCADES{X}];
varying vec4 vPositionFromLight{X}[SHADOWCSMNUM_CASCADES{X}];
varying float vDepthMetric{X}[SHADOWCSMNUM_CASCADES{X}];
varying vec4 vPositionFromCamera{X};
#elif defined(SHADOWCUBE{X})
#else
varying vec4 vPositionFromLight{X};
varying float vDepthMetric{X};
uniform mat4 lightMatrix{X};
#endif
#endif
#endif
`;
C.IncludesShadersStore[ma] = pa;
const Ta = "prePassVertex", Aa = `#ifdef PREPASS_DEPTH
vViewPos=(view*worldPos).rgb;
#endif
#if defined(PREPASS_VELOCITY) && defined(BONES_VELOCITY_ENABLED)
vCurrentPosition=viewProjection*worldPos;
#if NUM_BONE_INFLUENCERS>0
mat4 previousInfluence;
previousInfluence=mPreviousBones[int(matricesIndices[0])]*matricesWeights[0];
#if NUM_BONE_INFLUENCERS>1
previousInfluence+=mPreviousBones[int(matricesIndices[1])]*matricesWeights[1];
#endif 
#if NUM_BONE_INFLUENCERS>2
previousInfluence+=mPreviousBones[int(matricesIndices[2])]*matricesWeights[2];
#endif 
#if NUM_BONE_INFLUENCERS>3
previousInfluence+=mPreviousBones[int(matricesIndices[3])]*matricesWeights[3];
#endif
#if NUM_BONE_INFLUENCERS>4
previousInfluence+=mPreviousBones[int(matricesIndicesExtra[0])]*matricesWeightsExtra[0];
#endif 
#if NUM_BONE_INFLUENCERS>5
previousInfluence+=mPreviousBones[int(matricesIndicesExtra[1])]*matricesWeightsExtra[1];
#endif 
#if NUM_BONE_INFLUENCERS>6
previousInfluence+=mPreviousBones[int(matricesIndicesExtra[2])]*matricesWeightsExtra[2];
#endif 
#if NUM_BONE_INFLUENCERS>7
previousInfluence+=mPreviousBones[int(matricesIndicesExtra[3])]*matricesWeightsExtra[3];
#endif
vPreviousPosition=previousViewProjection*finalPreviousWorld*previousInfluence*vec4(positionUpdated,1.0);
#else
vPreviousPosition=previousViewProjection*finalPreviousWorld*vec4(positionUpdated,1.0);
#endif
#endif
`;
C.IncludesShadersStore[Ta] = Aa;
const ga = "uvVariableDeclaration", Sa = `#if !defined(UV{X}) && defined(MAINUV{X})
vec2 uv{X}=vec2(0.,0.);
#endif
#ifdef MAINUV{X}
vMainUV{X}=uv{X};
#endif
`;
C.IncludesShadersStore[ga] = Sa;
const Ra = "samplerVertexImplementation", Ca = `#if defined(_DEFINENAME_) && _DEFINENAME_DIRECTUV==0
if (v_INFONAME_==0.)
{
v_VARYINGNAME_UV=vec2(_MATRIXNAME_Matrix*vec4(uvUpdated,1.0,0.0));
}
#ifdef UV2
else if (v_INFONAME_==1.)
{
v_VARYINGNAME_UV=vec2(_MATRIXNAME_Matrix*vec4(uv2,1.0,0.0));
}
#endif
#ifdef UV3
else if (v_INFONAME_==2.)
{
v_VARYINGNAME_UV=vec2(_MATRIXNAME_Matrix*vec4(uv3,1.0,0.0));
}
#endif
#ifdef UV4
else if (v_INFONAME_==3.)
{
v_VARYINGNAME_UV=vec2(_MATRIXNAME_Matrix*vec4(uv4,1.0,0.0));
}
#endif
#ifdef UV5
else if (v_INFONAME_==4.)
{
v_VARYINGNAME_UV=vec2(_MATRIXNAME_Matrix*vec4(uv5,1.0,0.0));
}
#endif
#ifdef UV6
else if (v_INFONAME_==5.)
{
v_VARYINGNAME_UV=vec2(_MATRIXNAME_Matrix*vec4(uv6,1.0,0.0));
}
#endif
#endif
`;
C.IncludesShadersStore[Ra] = Ca;
const va = "bumpVertex", Ia = `#if defined(BUMP) || defined(PARALLAX) || defined(CLEARCOAT_BUMP) || defined(ANISOTROPIC)
#if defined(TANGENT) && defined(NORMAL)
vec3 tbnNormal=normalize(normalUpdated);
vec3 tbnTangent=normalize(tangentUpdated.xyz);
vec3 tbnBitangent=cross(tbnNormal,tbnTangent)*tangentUpdated.w;
vTBN=mat3(finalWorld)*mat3(tbnTangent,tbnBitangent,tbnNormal);
#endif
#endif
`;
C.IncludesShadersStore[va] = Ia;
const Ma = "fogVertex", xa = `#ifdef FOG
vFogDistance=(view*worldPos).xyz;
#endif
`;
C.IncludesShadersStore[Ma] = xa;
const Na = "shadowsVertex", Oa = `#ifdef SHADOWS
#if defined(SHADOWCSM{X})
vPositionFromCamera{X}=view*worldPos;
for (int i=0; i<SHADOWCSMNUM_CASCADES{X}; i++) {
vPositionFromLight{X}[i]=lightMatrix{X}[i]*worldPos;
#ifdef USE_REVERSE_DEPTHBUFFER
vDepthMetric{X}[i]=(-vPositionFromLight{X}[i].z+light{X}.depthValues.x)/light{X}.depthValues.y;
#else
vDepthMetric{X}[i]=(vPositionFromLight{X}[i].z+light{X}.depthValues.x)/light{X}.depthValues.y;
#endif
}
#elif defined(SHADOW{X}) && !defined(SHADOWCUBE{X})
vPositionFromLight{X}=lightMatrix{X}*worldPos;
#ifdef USE_REVERSE_DEPTHBUFFER
vDepthMetric{X}=(-vPositionFromLight{X}.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#else
vDepthMetric{X}=(vPositionFromLight{X}.z+light{X}.depthValues.x)/light{X}.depthValues.y;
#endif
#endif
#endif
`;
C.IncludesShadersStore[Na] = Oa;
const La = "vertexColorMixing", Da = `#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
vColor=vec4(1.0);
#ifdef VERTEXCOLOR
#ifdef VERTEXALPHA
vColor*=color;
#else
vColor.rgb*=color.rgb;
#endif
#endif
#ifdef INSTANCESCOLOR
vColor*=instanceColor;
#endif
#endif
`;
C.IncludesShadersStore[La] = Da;
const Pa = "pointCloudVertex", ba = `#if defined(POINTSIZE) && !defined(WEBGPU)
gl_PointSize=pointSize;
#endif
`;
C.IncludesShadersStore[Pa] = ba;
const Fa = "logDepthVertex", ya = `#ifdef LOGARITHMICDEPTH
vFragmentDepth=1.0+gl_Position.w;
gl_Position.z=log2(max(0.000001,vFragmentDepth))*logarithmicDepthConstant;
#endif
`;
C.IncludesShadersStore[Fa] = ya;
const Ua = "defaultVertexShader", wa = `#include<__decl__defaultVertex>
#define CUSTOM_VERTEX_BEGIN
attribute vec3 position;
#ifdef NORMAL
attribute vec3 normal;
#endif
#ifdef TANGENT
attribute vec4 tangent;
#endif
#ifdef UV1
attribute vec2 uv;
#endif
#include<uvAttributeDeclaration>[2..7]
#ifdef VERTEXCOLOR
attribute vec4 color;
#endif
#include<helperFunctions>
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
#include<prePassVertexDeclaration>
#include<mainUVVaryingDeclaration>[1..7]
#include<samplerVertexDeclaration>(_DEFINENAME_,DIFFUSE,_VARYINGNAME_,Diffuse)
#include<samplerVertexDeclaration>(_DEFINENAME_,DETAIL,_VARYINGNAME_,Detail)
#include<samplerVertexDeclaration>(_DEFINENAME_,AMBIENT,_VARYINGNAME_,Ambient)
#include<samplerVertexDeclaration>(_DEFINENAME_,OPACITY,_VARYINGNAME_,Opacity)
#include<samplerVertexDeclaration>(_DEFINENAME_,EMISSIVE,_VARYINGNAME_,Emissive)
#include<samplerVertexDeclaration>(_DEFINENAME_,LIGHTMAP,_VARYINGNAME_,Lightmap)
#if defined(SPECULARTERM)
#include<samplerVertexDeclaration>(_DEFINENAME_,SPECULAR,_VARYINGNAME_,Specular)
#endif
#include<samplerVertexDeclaration>(_DEFINENAME_,BUMP,_VARYINGNAME_,Bump)
#include<samplerVertexDeclaration>(_DEFINENAME_,DECAL,_VARYINGNAME_,Decal)
varying vec3 vPositionW;
#ifdef NORMAL
varying vec3 vNormalW;
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vec4 vColor;
#endif
#include<bumpVertexDeclaration>
#include<clipPlaneVertexDeclaration>
#include<fogVertexDeclaration>
#include<__decl__lightVxFragment>[0..maxSimultaneousLights]
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#ifdef REFLECTIONMAP_SKYBOX
varying vec3 vPositionUVW;
#endif
#if defined(REFLECTIONMAP_EQUIRECTANGULAR_FIXED) || defined(REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED)
varying vec3 vDirectionW;
#endif
#include<logDepthDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vec3 positionUpdated=position;
#ifdef NORMAL
vec3 normalUpdated=normal;
#endif
#ifdef TANGENT
vec4 tangentUpdated=tangent;
#endif
#ifdef UV1
vec2 uvUpdated=uv;
#endif
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#ifdef REFLECTIONMAP_SKYBOX
vPositionUVW=positionUpdated;
#endif
#define CUSTOM_VERTEX_UPDATE_POSITION
#define CUSTOM_VERTEX_UPDATE_NORMAL
#include<instancesVertex>
#if defined(PREPASS) && defined(PREPASS_VELOCITY) && !defined(BONES_VELOCITY_ENABLED)
vCurrentPosition=viewProjection*finalWorld*vec4(positionUpdated,1.0);
vPreviousPosition=previousViewProjection*finalPreviousWorld*vec4(positionUpdated,1.0);
#endif
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(positionUpdated,1.0);
#ifdef NORMAL
mat3 normalWorld=mat3(finalWorld);
#if defined(INSTANCES) && defined(THIN_INSTANCES)
vNormalW=normalUpdated/vec3(dot(normalWorld[0],normalWorld[0]),dot(normalWorld[1],normalWorld[1]),dot(normalWorld[2],normalWorld[2]));
vNormalW=normalize(normalWorld*vNormalW);
#else
#ifdef NONUNIFORMSCALING
normalWorld=transposeMat3(inverseMat3(normalWorld));
#endif
vNormalW=normalize(normalWorld*normalUpdated);
#endif
#endif
#define CUSTOM_VERTEX_UPDATE_WORLDPOS
#ifdef MULTIVIEW
if (gl_ViewID_OVR==0u) {
gl_Position=viewProjection*worldPos;
} else {
gl_Position=viewProjectionR*worldPos;
}
#else
gl_Position=viewProjection*worldPos;
#endif
vPositionW=vec3(worldPos);
#include<prePassVertex>
#if defined(REFLECTIONMAP_EQUIRECTANGULAR_FIXED) || defined(REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED)
vDirectionW=normalize(vec3(finalWorld*vec4(positionUpdated,0.0)));
#endif
#ifndef UV1
vec2 uvUpdated=vec2(0.,0.);
#endif
#ifdef MAINUV1
vMainUV1=uvUpdated;
#endif
#include<uvVariableDeclaration>[2..7]
#include<samplerVertexImplementation>(_DEFINENAME_,DIFFUSE,_VARYINGNAME_,Diffuse,_MATRIXNAME_,diffuse,_INFONAME_,DiffuseInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,DETAIL,_VARYINGNAME_,Detail,_MATRIXNAME_,detail,_INFONAME_,DetailInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,AMBIENT,_VARYINGNAME_,Ambient,_MATRIXNAME_,ambient,_INFONAME_,AmbientInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,OPACITY,_VARYINGNAME_,Opacity,_MATRIXNAME_,opacity,_INFONAME_,OpacityInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,EMISSIVE,_VARYINGNAME_,Emissive,_MATRIXNAME_,emissive,_INFONAME_,EmissiveInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,LIGHTMAP,_VARYINGNAME_,Lightmap,_MATRIXNAME_,lightmap,_INFONAME_,LightmapInfos.x)
#if defined(SPECULARTERM)
#include<samplerVertexImplementation>(_DEFINENAME_,SPECULAR,_VARYINGNAME_,Specular,_MATRIXNAME_,specular,_INFONAME_,SpecularInfos.x)
#endif
#include<samplerVertexImplementation>(_DEFINENAME_,BUMP,_VARYINGNAME_,Bump,_MATRIXNAME_,bump,_INFONAME_,BumpInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,DECAL,_VARYINGNAME_,Decal,_MATRIXNAME_,decal,_INFONAME_,DecalInfos.x)
#include<bumpVertex>
#include<clipPlaneVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#include<vertexColorMixing>
#include<pointCloudVertex>
#include<logDepthVertex>
#define CUSTOM_VERTEX_MAIN_END
}
`;
C.ShadersStore[Ua] = wa;
const Ba = new RegExp("^([gimus]+)!");
class Qe {
  /**
   * Creates a new instance of the plugin manager
   * @param material material that this manager will manage the plugins for
   */
  constructor(e) {
    this._plugins = [], this._activePlugins = [], this._activePluginsForExtraEvents = [], this._material = e, this._scene = e.getScene(), this._engine = this._scene.getEngine();
  }
  /**
   * @internal
   */
  _addPlugin(e) {
    for (let r = 0; r < this._plugins.length; ++r)
      if (this._plugins[r].name === e.name)
        throw `Plugin "${e.name}" already added to the material "${this._material.name}"!`;
    if (this._material._uniformBufferLayoutBuilt)
      throw `The plugin "${e.name}" can't be added to the material "${this._material.name}" because this material has already been used for rendering! Please add plugins to materials before any rendering with this material occurs.`;
    const t = e.getClassName();
    Qe._MaterialPluginClassToMainDefine[t] || (Qe._MaterialPluginClassToMainDefine[t] = "MATERIALPLUGIN_" + ++Qe._MaterialPluginCounter), this._material._callbackPluginEventGeneric = this._handlePluginEvent.bind(this), this._plugins.push(e), this._plugins.sort((r, s) => r.priority - s.priority), this._codeInjectionPoints = {};
    const i = {};
    i[Qe._MaterialPluginClassToMainDefine[t]] = {
      type: "boolean",
      default: !0
    };
    for (const r of this._plugins)
      r.collectDefines(i), this._collectPointNames("vertex", r.getCustomCode("vertex")), this._collectPointNames("fragment", r.getCustomCode("fragment"));
    this._defineNamesFromPlugins = i;
  }
  /**
   * @internal
   */
  _activatePlugin(e) {
    this._activePlugins.indexOf(e) === -1 && (this._activePlugins.push(e), this._activePlugins.sort((t, i) => t.priority - i.priority), this._material._callbackPluginEventIsReadyForSubMesh = this._handlePluginEventIsReadyForSubMesh.bind(this), this._material._callbackPluginEventPrepareDefinesBeforeAttributes = this._handlePluginEventPrepareDefinesBeforeAttributes.bind(this), this._material._callbackPluginEventPrepareDefines = this._handlePluginEventPrepareDefines.bind(this), this._material._callbackPluginEventBindForSubMesh = this._handlePluginEventBindForSubMesh.bind(this), e.registerForExtraEvents && (this._activePluginsForExtraEvents.push(e), this._activePluginsForExtraEvents.sort((t, i) => t.priority - i.priority), this._material._callbackPluginEventHasRenderTargetTextures = this._handlePluginEventHasRenderTargetTextures.bind(this), this._material._callbackPluginEventFillRenderTargetTextures = this._handlePluginEventFillRenderTargetTextures.bind(this), this._material._callbackPluginEventHardBindForSubMesh = this._handlePluginEventHardBindForSubMesh.bind(this)));
  }
  /**
   * Gets a plugin from the list of plugins managed by this manager
   * @param name name of the plugin
   * @returns the plugin if found, else null
   */
  getPlugin(e) {
    for (let t = 0; t < this._plugins.length; ++t)
      if (this._plugins[t].name === e)
        return this._plugins[t];
    return null;
  }
  _handlePluginEventIsReadyForSubMesh(e) {
    let t = !0;
    for (const i of this._activePlugins)
      t = t && i.isReadyForSubMesh(e.defines, this._scene, this._engine, e.subMesh);
    e.isReadyForSubMesh = t;
  }
  _handlePluginEventPrepareDefinesBeforeAttributes(e) {
    for (const t of this._activePlugins)
      t.prepareDefinesBeforeAttributes(e.defines, this._scene, e.mesh);
  }
  _handlePluginEventPrepareDefines(e) {
    for (const t of this._activePlugins)
      t.prepareDefines(e.defines, this._scene, e.mesh);
  }
  _handlePluginEventHardBindForSubMesh(e) {
    for (const t of this._activePluginsForExtraEvents)
      t.hardBindForSubMesh(this._material._uniformBuffer, this._scene, this._engine, e.subMesh);
  }
  _handlePluginEventBindForSubMesh(e) {
    for (const t of this._activePlugins)
      t.bindForSubMesh(this._material._uniformBuffer, this._scene, this._engine, e.subMesh);
  }
  _handlePluginEventHasRenderTargetTextures(e) {
    let t = !1;
    for (const i of this._activePluginsForExtraEvents)
      if (t = i.hasRenderTargetTextures(), t)
        break;
    e.hasRenderTargetTextures = t;
  }
  _handlePluginEventFillRenderTargetTextures(e) {
    for (const t of this._activePluginsForExtraEvents)
      t.fillRenderTargetTextures(e.renderTargets);
  }
  _handlePluginEvent(e, t) {
    var i;
    switch (e) {
      case Ie.GetActiveTextures: {
        const r = t;
        for (const s of this._activePlugins)
          s.getActiveTextures(r.activeTextures);
        break;
      }
      case Ie.GetAnimatables: {
        const r = t;
        for (const s of this._activePlugins)
          s.getAnimatables(r.animatables);
        break;
      }
      case Ie.HasTexture: {
        const r = t;
        let s = !1;
        for (const n of this._activePlugins)
          if (s = n.hasTexture(r.texture), s)
            break;
        r.hasTexture = s;
        break;
      }
      case Ie.Disposed: {
        const r = t;
        for (const s of this._plugins)
          s.dispose(r.forceDisposeTextures);
        break;
      }
      case Ie.GetDefineNames: {
        const r = t;
        r.defineNames = this._defineNamesFromPlugins;
        break;
      }
      case Ie.PrepareEffect: {
        const r = t;
        for (const s of this._activePlugins)
          r.fallbackRank = s.addFallbacks(r.defines, r.fallbacks, r.fallbackRank), s.getAttributes(r.attributes, this._scene, r.mesh);
        this._uniformList.length > 0 && r.uniforms.push(...this._uniformList), this._samplerList.length > 0 && r.samplers.push(...this._samplerList), this._uboList.length > 0 && r.uniformBuffersNames.push(...this._uboList), r.customCode = this._injectCustomCode(r.customCode);
        break;
      }
      case Ie.PrepareUniformBuffer: {
        const r = t;
        this._uboDeclaration = "", this._vertexDeclaration = "", this._fragmentDeclaration = "", this._uniformList = [], this._samplerList = [], this._uboList = [];
        for (const s of this._plugins) {
          const n = s.getUniforms();
          if (n) {
            if (n.ubo)
              for (const o of n.ubo) {
                if (o.size && o.type) {
                  const a = (i = o.arraySize) !== null && i !== void 0 ? i : 0;
                  r.ubo.addUniform(o.name, o.size, a), this._uboDeclaration += `${o.type} ${o.name}${a > 0 ? `[${a}]` : ""};\r
`;
                }
                this._uniformList.push(o.name);
              }
            n.vertex && (this._vertexDeclaration += n.vertex + `\r
`), n.fragment && (this._fragmentDeclaration += n.fragment + `\r
`);
          }
          s.getSamplers(this._samplerList), s.getUniformBuffersNames(this._uboList);
        }
        break;
      }
    }
  }
  _collectPointNames(e, t) {
    if (t)
      for (const i in t)
        this._codeInjectionPoints[e] || (this._codeInjectionPoints[e] = {}), this._codeInjectionPoints[e][i] = !0;
  }
  _injectCustomCode(e) {
    return (t, i) => {
      var r;
      e && (i = e(t, i)), this._uboDeclaration && (i = i.replace("#define ADDITIONAL_UBO_DECLARATION", this._uboDeclaration)), this._vertexDeclaration && (i = i.replace("#define ADDITIONAL_VERTEX_DECLARATION", this._vertexDeclaration)), this._fragmentDeclaration && (i = i.replace("#define ADDITIONAL_FRAGMENT_DECLARATION", this._fragmentDeclaration));
      const s = (r = this._codeInjectionPoints) === null || r === void 0 ? void 0 : r[t];
      if (!s)
        return i;
      for (let n in s) {
        let o = "";
        for (const a of this._activePlugins) {
          const f = a.getCustomCode(t);
          f != null && f[n] && (o += f[n] + `\r
`);
        }
        if (o.length > 0)
          if (n.charAt(0) === "!") {
            n = n.substring(1);
            let a = "g";
            if (n.charAt(0) === "!")
              a = "", n = n.substring(1);
            else {
              const E = Ba.exec(n);
              E && E.length >= 2 && (a = E[1], n = n.substring(a.length + 1));
            }
            a.indexOf("g") < 0 && (a += "g");
            const f = i, c = new RegExp(n, a);
            let d = c.exec(f);
            for (; d !== null; ) {
              let E = o;
              for (let u = 0; u < d.length; ++u)
                E = E.replace("$" + u, d[u]);
              i = i.replace(d[0], E), d = c.exec(f);
            }
          } else {
            const a = "#define " + n;
            i = i.replace(a, `\r
` + o + `\r
` + a);
          }
      }
      return i;
    };
  }
}
Qe._MaterialPluginClassToMainDefine = {};
Qe._MaterialPluginCounter = 0;
class we {
  _enable(e) {
    e && this._pluginManager._activatePlugin(this);
  }
  /**
   * Creates a new material plugin
   * @param material parent material of the plugin
   * @param name name of the plugin
   * @param priority priority of the plugin
   * @param defines list of defines used by the plugin. The value of the property is the default value for this property
   * @param addToPluginList true to add the plugin to the list of plugins managed by the material plugin manager of the material (default: true)
   * @param enable true to enable the plugin (it is handy if the plugin does not handle properties to switch its current activation)
   */
  constructor(e, t, i, r, s = !0, n = !1) {
    this.priority = 500, this.registerForExtraEvents = !1, this._material = e, this.name = t, this.priority = i, e.pluginManager || (e.pluginManager = new Qe(e), e.onDisposeObservable.add(() => {
      e.pluginManager = void 0;
    })), this._pluginDefineNames = r, this._pluginManager = e.pluginManager, s && this._pluginManager._addPlugin(this), n && this._enable(!0), this.markAllDefinesAsDirty = e._dirtyCallbacks[63];
  }
  /**
   * Gets the current class name useful for serialization or dynamic coding.
   * @returns The class name.
   */
  getClassName() {
    return "MaterialPluginBase";
  }
  /**
   * Specifies that the submesh is ready to be used.
   * @param defines the list of "defines" to update.
   * @param scene defines the scene the material belongs to.
   * @param engine the engine this scene belongs to.
   * @param subMesh the submesh to check for readiness
   * @returns - boolean indicating that the submesh is ready or not.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isReadyForSubMesh(e, t, i, r) {
    return !0;
  }
  /**
   * Binds the material data (this function is called even if mustRebind() returns false)
   * @param uniformBuffer defines the Uniform buffer to fill in.
   * @param scene defines the scene the material belongs to.
   * @param engine defines the engine the material belongs to.
   * @param subMesh the submesh to bind data for
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hardBindForSubMesh(e, t, i, r) {
  }
  /**
   * Binds the material data.
   * @param uniformBuffer defines the Uniform buffer to fill in.
   * @param scene defines the scene the material belongs to.
   * @param engine the engine this scene belongs to.
   * @param subMesh the submesh to bind data for
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  bindForSubMesh(e, t, i, r) {
  }
  /**
   * Disposes the resources of the material.
   * @param forceDisposeTextures - Forces the disposal of all textures.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  dispose(e) {
  }
  /**
   * Returns a list of custom shader code fragments to customize the shader.
   * @param shaderType "vertex" or "fragment"
   * @returns null if no code to be added, or a list of pointName => code.
   * Note that `pointName` can also be a regular expression if it starts with a `!`.
   * In that case, the string found by the regular expression (if any) will be
   * replaced by the code provided.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getCustomCode(e) {
    return null;
  }
  /**
   * Collects all defines.
   * @param defines The object to append to.
   */
  collectDefines(e) {
    if (this._pluginDefineNames)
      for (const t of Object.keys(this._pluginDefineNames)) {
        if (t[0] === "_")
          continue;
        const i = typeof this._pluginDefineNames[t];
        e[t] = {
          type: i === "number" ? "number" : i === "string" ? "string" : i === "boolean" ? "boolean" : "object",
          default: this._pluginDefineNames[t]
        };
      }
  }
  /**
   * Sets the defines for the next rendering. Called before MaterialHelper.PrepareDefinesForAttributes is called.
   * @param defines the list of "defines" to update.
   * @param scene defines the scene to the material belongs to.
   * @param mesh the mesh being rendered
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prepareDefinesBeforeAttributes(e, t, i) {
  }
  /**
   * Sets the defines for the next rendering
   * @param defines the list of "defines" to update.
   * @param scene defines the scene to the material belongs to.
   * @param mesh the mesh being rendered
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prepareDefines(e, t, i) {
  }
  /**
   * Checks to see if a texture is used in the material.
   * @param texture - Base texture to use.
   * @returns - Boolean specifying if a texture is used in the material.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hasTexture(e) {
    return !1;
  }
  /**
   * Gets a boolean indicating that current material needs to register RTT
   * @returns true if this uses a render target otherwise false.
   */
  hasRenderTargetTextures() {
    return !1;
  }
  /**
   * Fills the list of render target textures.
   * @param renderTargets the list of render targets to update
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fillRenderTargetTextures(e) {
  }
  /**
   * Returns an array of the actively used textures.
   * @param activeTextures Array of BaseTextures
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getActiveTextures(e) {
  }
  /**
   * Returns the animatable textures.
   * @param animatables Array of animatable textures.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAnimatables(e) {
  }
  /**
   * Add fallbacks to the effect fallbacks list.
   * @param defines defines the Base texture to use.
   * @param fallbacks defines the current fallback list.
   * @param currentRank defines the current fallback rank.
   * @returns the new fallback rank.
   */
  addFallbacks(e, t, i) {
    return i;
  }
  /**
   * Gets the samplers used by the plugin.
   * @param samplers list that the sampler names should be added to.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getSamplers(e) {
  }
  /**
   * Gets the attributes used by the plugin.
   * @param attributes list that the attribute names should be added to.
   * @param scene the scene that the material belongs to.
   * @param mesh the mesh being rendered.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAttributes(e, t, i) {
  }
  /**
   * Gets the uniform buffers names added by the plugin.
   * @param ubos list that the ubo names should be added to.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getUniformBuffersNames(e) {
  }
  /**
   * Gets the description of the uniforms to add to the ubo (if engine supports ubos) or to inject directly in the vertex/fragment shaders (if engine does not support ubos)
   * @returns the description of the uniforms
   */
  getUniforms() {
    return {};
  }
  /**
   * Makes a duplicate of the current configuration into another one.
   * @param plugin define the config where to copy the info
   */
  copyTo(e) {
    j.Clone(() => e, this);
  }
  /**
   * Serializes this clear coat configuration.
   * @returns - An object with the serialized config.
   */
  serialize() {
    return j.Serialize(this);
  }
  /**
   * Parses a anisotropy Configuration from a serialized object.
   * @param source - Serialized object.
   * @param scene Defines the scene we are parsing for
   * @param rootUrl Defines the rootUrl to load from
   */
  parse(e, t, i) {
    j.Parse(() => this, e, t, i);
  }
}
h([
  T()
], we.prototype, "name", void 0);
h([
  T()
], we.prototype, "priority", void 0);
h([
  T()
], we.prototype, "registerForExtraEvents", void 0);
class Va extends ye {
  constructor() {
    super(...arguments), this.DETAIL = !1, this.DETAILDIRECTUV = 0, this.DETAIL_NORMALBLENDMETHOD = 0;
  }
}
class $e extends we {
  /** @internal */
  _markAllSubMeshesAsTexturesDirty() {
    this._enable(this._isEnabled), this._internalMarkAllSubMeshesAsTexturesDirty();
  }
  constructor(e, t = !0) {
    super(e, "DetailMap", 140, new Va(), t), this._texture = null, this.diffuseBlendLevel = 1, this.roughnessBlendLevel = 1, this.bumpLevel = 1, this._normalBlendMethod = Ze.MATERIAL_NORMALBLENDMETHOD_WHITEOUT, this._isEnabled = !1, this.isEnabled = !1, this._internalMarkAllSubMeshesAsTexturesDirty = e._dirtyCallbacks[1];
  }
  isReadyForSubMesh(e, t, i) {
    return this._isEnabled ? !(e._areTexturesDirty && t.texturesEnabled && i.getCaps().standardDerivatives && this._texture && S.DetailTextureEnabled && !this._texture.isReady()) : !0;
  }
  prepareDefines(e, t) {
    if (this._isEnabled) {
      e.DETAIL_NORMALBLENDMETHOD = this._normalBlendMethod;
      const i = t.getEngine();
      e._areTexturesDirty && (i.getCaps().standardDerivatives && this._texture && S.DetailTextureEnabled && this._isEnabled ? (M.PrepareDefinesForMergedUV(this._texture, e, "DETAIL"), e.DETAIL_NORMALBLENDMETHOD = this._normalBlendMethod) : e.DETAIL = !1);
    } else
      e.DETAIL = !1;
  }
  bindForSubMesh(e, t) {
    if (!this._isEnabled)
      return;
    const i = this._material.isFrozen;
    (!e.useUbo || !i || !e.isSync) && this._texture && S.DetailTextureEnabled && (e.updateFloat4("vDetailInfos", this._texture.coordinatesIndex, this.diffuseBlendLevel, this.bumpLevel, this.roughnessBlendLevel), M.BindTextureMatrix(this._texture, e, "detail")), t.texturesEnabled && this._texture && S.DetailTextureEnabled && e.setTexture("detailSampler", this._texture);
  }
  hasTexture(e) {
    return this._texture === e;
  }
  getActiveTextures(e) {
    this._texture && e.push(this._texture);
  }
  getAnimatables(e) {
    this._texture && this._texture.animations && this._texture.animations.length > 0 && e.push(this._texture);
  }
  dispose(e) {
    var t;
    e && ((t = this._texture) === null || t === void 0 || t.dispose());
  }
  getClassName() {
    return "DetailMapConfiguration";
  }
  getSamplers(e) {
    e.push("detailSampler");
  }
  getUniforms() {
    return {
      ubo: [
        { name: "vDetailInfos", size: 4, type: "vec4" },
        { name: "detailMatrix", size: 16, type: "mat4" }
      ]
    };
  }
}
h([
  z("detailTexture"),
  v("_markAllSubMeshesAsTexturesDirty")
], $e.prototype, "texture", void 0);
h([
  T()
], $e.prototype, "diffuseBlendLevel", void 0);
h([
  T()
], $e.prototype, "roughnessBlendLevel", void 0);
h([
  T()
], $e.prototype, "bumpLevel", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], $e.prototype, "normalBlendMethod", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], $e.prototype, "isEnabled", void 0);
const ti = { effect: null, subMesh: null };
class Ga extends ye {
  /**
   * Initializes the Standard Material defines.
   * @param externalProperties The external properties
   */
  constructor(e) {
    super(e), this.MAINUV1 = !1, this.MAINUV2 = !1, this.MAINUV3 = !1, this.MAINUV4 = !1, this.MAINUV5 = !1, this.MAINUV6 = !1, this.DIFFUSE = !1, this.DIFFUSEDIRECTUV = 0, this.BAKED_VERTEX_ANIMATION_TEXTURE = !1, this.AMBIENT = !1, this.AMBIENTDIRECTUV = 0, this.OPACITY = !1, this.OPACITYDIRECTUV = 0, this.OPACITYRGB = !1, this.REFLECTION = !1, this.EMISSIVE = !1, this.EMISSIVEDIRECTUV = 0, this.SPECULAR = !1, this.SPECULARDIRECTUV = 0, this.BUMP = !1, this.BUMPDIRECTUV = 0, this.PARALLAX = !1, this.PARALLAXOCCLUSION = !1, this.SPECULAROVERALPHA = !1, this.CLIPPLANE = !1, this.CLIPPLANE2 = !1, this.CLIPPLANE3 = !1, this.CLIPPLANE4 = !1, this.CLIPPLANE5 = !1, this.CLIPPLANE6 = !1, this.ALPHATEST = !1, this.DEPTHPREPASS = !1, this.ALPHAFROMDIFFUSE = !1, this.POINTSIZE = !1, this.FOG = !1, this.SPECULARTERM = !1, this.DIFFUSEFRESNEL = !1, this.OPACITYFRESNEL = !1, this.REFLECTIONFRESNEL = !1, this.REFRACTIONFRESNEL = !1, this.EMISSIVEFRESNEL = !1, this.FRESNEL = !1, this.NORMAL = !1, this.TANGENT = !1, this.UV1 = !1, this.UV2 = !1, this.UV3 = !1, this.UV4 = !1, this.UV5 = !1, this.UV6 = !1, this.VERTEXCOLOR = !1, this.VERTEXALPHA = !1, this.NUM_BONE_INFLUENCERS = 0, this.BonesPerMesh = 0, this.BONETEXTURE = !1, this.BONES_VELOCITY_ENABLED = !1, this.INSTANCES = !1, this.THIN_INSTANCES = !1, this.INSTANCESCOLOR = !1, this.GLOSSINESS = !1, this.ROUGHNESS = !1, this.EMISSIVEASILLUMINATION = !1, this.LINKEMISSIVEWITHDIFFUSE = !1, this.REFLECTIONFRESNELFROMSPECULAR = !1, this.LIGHTMAP = !1, this.LIGHTMAPDIRECTUV = 0, this.OBJECTSPACE_NORMALMAP = !1, this.USELIGHTMAPASSHADOWMAP = !1, this.REFLECTIONMAP_3D = !1, this.REFLECTIONMAP_SPHERICAL = !1, this.REFLECTIONMAP_PLANAR = !1, this.REFLECTIONMAP_CUBIC = !1, this.USE_LOCAL_REFLECTIONMAP_CUBIC = !1, this.USE_LOCAL_REFRACTIONMAP_CUBIC = !1, this.REFLECTIONMAP_PROJECTION = !1, this.REFLECTIONMAP_SKYBOX = !1, this.REFLECTIONMAP_EXPLICIT = !1, this.REFLECTIONMAP_EQUIRECTANGULAR = !1, this.REFLECTIONMAP_EQUIRECTANGULAR_FIXED = !1, this.REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED = !1, this.REFLECTIONMAP_OPPOSITEZ = !1, this.INVERTCUBICMAP = !1, this.LOGARITHMICDEPTH = !1, this.REFRACTION = !1, this.REFRACTIONMAP_3D = !1, this.REFLECTIONOVERALPHA = !1, this.TWOSIDEDLIGHTING = !1, this.SHADOWFLOAT = !1, this.MORPHTARGETS = !1, this.MORPHTARGETS_NORMAL = !1, this.MORPHTARGETS_TANGENT = !1, this.MORPHTARGETS_UV = !1, this.NUM_MORPH_INFLUENCERS = 0, this.MORPHTARGETS_TEXTURE = !1, this.NONUNIFORMSCALING = !1, this.PREMULTIPLYALPHA = !1, this.ALPHATEST_AFTERALLALPHACOMPUTATIONS = !1, this.ALPHABLEND = !0, this.PREPASS = !1, this.PREPASS_IRRADIANCE = !1, this.PREPASS_IRRADIANCE_INDEX = -1, this.PREPASS_ALBEDO_SQRT = !1, this.PREPASS_ALBEDO_SQRT_INDEX = -1, this.PREPASS_DEPTH = !1, this.PREPASS_DEPTH_INDEX = -1, this.PREPASS_NORMAL = !1, this.PREPASS_NORMAL_INDEX = -1, this.PREPASS_POSITION = !1, this.PREPASS_POSITION_INDEX = -1, this.PREPASS_VELOCITY = !1, this.PREPASS_VELOCITY_INDEX = -1, this.PREPASS_REFLECTIVITY = !1, this.PREPASS_REFLECTIVITY_INDEX = -1, this.SCENE_MRT_COUNT = 0, this.RGBDLIGHTMAP = !1, this.RGBDREFLECTION = !1, this.RGBDREFRACTION = !1, this.IMAGEPROCESSING = !1, this.VIGNETTE = !1, this.VIGNETTEBLENDMODEMULTIPLY = !1, this.VIGNETTEBLENDMODEOPAQUE = !1, this.TONEMAPPING = !1, this.TONEMAPPING_ACES = !1, this.CONTRAST = !1, this.COLORCURVES = !1, this.COLORGRADING = !1, this.COLORGRADING3D = !1, this.SAMPLER3DGREENDEPTH = !1, this.SAMPLER3DBGRMAP = !1, this.DITHER = !1, this.IMAGEPROCESSINGPOSTPROCESS = !1, this.SKIPFINALCOLORCLAMP = !1, this.MULTIVIEW = !1, this.ORDER_INDEPENDENT_TRANSPARENCY = !1, this.ORDER_INDEPENDENT_TRANSPARENCY_16BITS = !1, this.CAMERA_ORTHOGRAPHIC = !1, this.CAMERA_PERSPECTIVE = !1, this.IS_REFLECTION_LINEAR = !1, this.IS_REFRACTION_LINEAR = !1, this.EXPOSURE = !1, this.rebuild();
  }
  setReflectionMode(e) {
    const t = [
      "REFLECTIONMAP_CUBIC",
      "REFLECTIONMAP_EXPLICIT",
      "REFLECTIONMAP_PLANAR",
      "REFLECTIONMAP_PROJECTION",
      "REFLECTIONMAP_PROJECTION",
      "REFLECTIONMAP_SKYBOX",
      "REFLECTIONMAP_SPHERICAL",
      "REFLECTIONMAP_EQUIRECTANGULAR",
      "REFLECTIONMAP_EQUIRECTANGULAR_FIXED",
      "REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED"
    ];
    for (const i of t)
      this[i] = i === e;
  }
}
class x extends di {
  /**
   * Gets the image processing configuration used either in this material.
   */
  get imageProcessingConfiguration() {
    return this._imageProcessingConfiguration;
  }
  /**
   * Sets the Default image processing configuration used either in the this material.
   *
   * If sets to null, the scene one is in use.
   */
  set imageProcessingConfiguration(e) {
    this._attachImageProcessingConfiguration(e), this._markAllSubMeshesAsTexturesDirty();
  }
  /**
   * Attaches a new image processing configuration to the Standard Material.
   * @param configuration
   */
  _attachImageProcessingConfiguration(e) {
    e !== this._imageProcessingConfiguration && (this._imageProcessingConfiguration && this._imageProcessingObserver && this._imageProcessingConfiguration.onUpdateParameters.remove(this._imageProcessingObserver), e ? this._imageProcessingConfiguration = e : this._imageProcessingConfiguration = this.getScene().imageProcessingConfiguration, this._imageProcessingConfiguration && (this._imageProcessingObserver = this._imageProcessingConfiguration.onUpdateParameters.add(() => {
      this._markAllSubMeshesAsImageProcessingDirty();
    })));
  }
  /**
   * Can this material render to prepass
   */
  get isPrePassCapable() {
    return !this.disableDepthWrite;
  }
  /**
   * Gets whether the color curves effect is enabled.
   */
  get cameraColorCurvesEnabled() {
    return this.imageProcessingConfiguration.colorCurvesEnabled;
  }
  /**
   * Sets whether the color curves effect is enabled.
   */
  set cameraColorCurvesEnabled(e) {
    this.imageProcessingConfiguration.colorCurvesEnabled = e;
  }
  /**
   * Gets whether the color grading effect is enabled.
   */
  get cameraColorGradingEnabled() {
    return this.imageProcessingConfiguration.colorGradingEnabled;
  }
  /**
   * Gets whether the color grading effect is enabled.
   */
  set cameraColorGradingEnabled(e) {
    this.imageProcessingConfiguration.colorGradingEnabled = e;
  }
  /**
   * Gets whether tonemapping is enabled or not.
   */
  get cameraToneMappingEnabled() {
    return this._imageProcessingConfiguration.toneMappingEnabled;
  }
  /**
   * Sets whether tonemapping is enabled or not
   */
  set cameraToneMappingEnabled(e) {
    this._imageProcessingConfiguration.toneMappingEnabled = e;
  }
  /**
   * The camera exposure used on this material.
   * This property is here and not in the camera to allow controlling exposure without full screen post process.
   * This corresponds to a photographic exposure.
   */
  get cameraExposure() {
    return this._imageProcessingConfiguration.exposure;
  }
  /**
   * The camera exposure used on this material.
   * This property is here and not in the camera to allow controlling exposure without full screen post process.
   * This corresponds to a photographic exposure.
   */
  set cameraExposure(e) {
    this._imageProcessingConfiguration.exposure = e;
  }
  /**
   * Gets The camera contrast used on this material.
   */
  get cameraContrast() {
    return this._imageProcessingConfiguration.contrast;
  }
  /**
   * Sets The camera contrast used on this material.
   */
  set cameraContrast(e) {
    this._imageProcessingConfiguration.contrast = e;
  }
  /**
   * Gets the Color Grading 2D Lookup Texture.
   */
  get cameraColorGradingTexture() {
    return this._imageProcessingConfiguration.colorGradingTexture;
  }
  /**
   * Sets the Color Grading 2D Lookup Texture.
   */
  set cameraColorGradingTexture(e) {
    this._imageProcessingConfiguration.colorGradingTexture = e;
  }
  /**
   * The color grading curves provide additional color adjustmnent that is applied after any color grading transform (3D LUT).
   * They allow basic adjustment of saturation and small exposure adjustments, along with color filter tinting to provide white balance adjustment or more stylistic effects.
   * These are similar to controls found in many professional imaging or colorist software. The global controls are applied to the entire image. For advanced tuning, extra controls are provided to adjust the shadow, midtone and highlight areas of the image;
   * corresponding to low luminance, medium luminance, and high luminance areas respectively.
   */
  get cameraColorCurves() {
    return this._imageProcessingConfiguration.colorCurves;
  }
  /**
   * The color grading curves provide additional color adjustment that is applied after any color grading transform (3D LUT).
   * They allow basic adjustment of saturation and small exposure adjustments, along with color filter tinting to provide white balance adjustment or more stylistic effects.
   * These are similar to controls found in many professional imaging or colorist software. The global controls are applied to the entire image. For advanced tuning, extra controls are provided to adjust the shadow, midtone and highlight areas of the image;
   * corresponding to low luminance, medium luminance, and high luminance areas respectively.
   */
  set cameraColorCurves(e) {
    this._imageProcessingConfiguration.colorCurves = e;
  }
  /**
   * Can this material render to several textures at once
   */
  get canRenderToMRT() {
    return !0;
  }
  /**
   * Instantiates a new standard material.
   * This is the default material used in Babylon. It is the best trade off between quality
   * and performances.
   * @see https://doc.babylonjs.com/features/featuresDeepDive/materials/using/materials_introduction
   * @param name Define the name of the material in the scene
   * @param scene Define the scene the material belong to
   */
  constructor(e, t) {
    super(e, t), this._diffuseTexture = null, this._ambientTexture = null, this._opacityTexture = null, this._reflectionTexture = null, this._emissiveTexture = null, this._specularTexture = null, this._bumpTexture = null, this._lightmapTexture = null, this._refractionTexture = null, this.ambientColor = new K(0, 0, 0), this.diffuseColor = new K(1, 1, 1), this.specularColor = new K(1, 1, 1), this.emissiveColor = new K(0, 0, 0), this.specularPower = 64, this._useAlphaFromDiffuseTexture = !1, this._useEmissiveAsIllumination = !1, this._linkEmissiveWithDiffuse = !1, this._useSpecularOverAlpha = !1, this._useReflectionOverAlpha = !1, this._disableLighting = !1, this._useObjectSpaceNormalMap = !1, this._useParallax = !1, this._useParallaxOcclusion = !1, this.parallaxScaleBias = 0.05, this._roughness = 0, this.indexOfRefraction = 0.98, this.invertRefractionY = !0, this.alphaCutOff = 0.4, this._useLightmapAsShadowmap = !1, this._useReflectionFresnelFromSpecular = !1, this._useGlossinessFromSpecularMapAlpha = !1, this._maxSimultaneousLights = 4, this._invertNormalMapX = !1, this._invertNormalMapY = !1, this._twoSidedLighting = !1, this._renderTargets = new yt(16), this._worldViewProjectionMatrix = B.Zero(), this._globalAmbientColor = new K(0, 0, 0), this._cacheHasRenderTargetTextures = !1, this.detailMap = new $e(this), this._attachImageProcessingConfiguration(null), this.prePassConfiguration = new wt(), this.getRenderTargetTextures = () => (this._renderTargets.reset(), x.ReflectionTextureEnabled && this._reflectionTexture && this._reflectionTexture.isRenderTarget && this._renderTargets.push(this._reflectionTexture), x.RefractionTextureEnabled && this._refractionTexture && this._refractionTexture.isRenderTarget && this._renderTargets.push(this._refractionTexture), this._eventInfo.renderTargets = this._renderTargets, this._callbackPluginEventFillRenderTargetTextures(this._eventInfo), this._renderTargets);
  }
  /**
   * Gets a boolean indicating that current material needs to register RTT
   */
  get hasRenderTargetTextures() {
    return x.ReflectionTextureEnabled && this._reflectionTexture && this._reflectionTexture.isRenderTarget || x.RefractionTextureEnabled && this._refractionTexture && this._refractionTexture.isRenderTarget ? !0 : this._cacheHasRenderTargetTextures;
  }
  /**
   * Gets the current class name of the material e.g. "StandardMaterial"
   * Mainly use in serialization.
   * @returns the class name
   */
  getClassName() {
    return "StandardMaterial";
  }
  /**
   * In case the depth buffer does not allow enough depth precision for your scene (might be the case in large scenes)
   * You can try switching to logarithmic depth.
   * @see https://doc.babylonjs.com/features/featuresDeepDive/materials/advanced/logarithmicDepthBuffer
   */
  get useLogarithmicDepth() {
    return this._useLogarithmicDepth;
  }
  set useLogarithmicDepth(e) {
    this._useLogarithmicDepth = e && this.getScene().getEngine().getCaps().fragmentDepthSupported, this._markAllSubMeshesAsMiscDirty();
  }
  /**
   * Specifies if the material will require alpha blending
   * @returns a boolean specifying if alpha blending is needed
   */
  needAlphaBlending() {
    return this._disableAlphaBlending ? !1 : this.alpha < 1 || this._opacityTexture != null || this._shouldUseAlphaFromDiffuseTexture() || this._opacityFresnelParameters && this._opacityFresnelParameters.isEnabled;
  }
  /**
   * Specifies if this material should be rendered in alpha test mode
   * @returns a boolean specifying if an alpha test is needed.
   */
  needAlphaTesting() {
    return this._forceAlphaTest ? !0 : this._hasAlphaChannel() && (this._transparencyMode == null || this._transparencyMode === Ze.MATERIAL_ALPHATEST);
  }
  /**
   * Specifies whether or not the alpha value of the diffuse texture should be used for alpha blending.
   */
  _shouldUseAlphaFromDiffuseTexture() {
    return this._diffuseTexture != null && this._diffuseTexture.hasAlpha && this._useAlphaFromDiffuseTexture && this._transparencyMode !== Ze.MATERIAL_OPAQUE;
  }
  /**
   * Specifies whether or not there is a usable alpha channel for transparency.
   */
  _hasAlphaChannel() {
    return this._diffuseTexture != null && this._diffuseTexture.hasAlpha || this._opacityTexture != null;
  }
  /**
   * Get the texture used for alpha test purpose.
   * @returns the diffuse texture in case of the standard material.
   */
  getAlphaTestTexture() {
    return this._diffuseTexture;
  }
  /**
   * Get if the submesh is ready to be used and all its information available.
   * Child classes can use it to update shaders
   * @param mesh defines the mesh to check
   * @param subMesh defines which submesh to check
   * @param useInstances specifies that instances should be used
   * @returns a boolean indicating that the submesh is ready or not
   */
  isReadyForSubMesh(e, t, i = !1) {
    if (this._uniformBufferLayoutBuilt || this.buildUniformLayout(), t.effect && this.isFrozen && t.effect._wasPreviouslyReady && t.effect._wasPreviouslyUsingInstances === i)
      return !0;
    t.materialDefines || (this._callbackPluginEventGeneric(Ie.GetDefineNames, this._eventInfo), t.materialDefines = new Ga(this._eventInfo.defineNames));
    const r = this.getScene(), s = t.materialDefines;
    if (this._isReadyForSubMesh(t))
      return !0;
    const n = r.getEngine();
    s._needNormals = M.PrepareDefinesForLights(r, e, s, !0, this._maxSimultaneousLights, this._disableLighting), M.PrepareDefinesForMultiview(r, s);
    const o = this.needAlphaBlendingForMesh(e) && this.getScene().useOrderIndependentTransparency;
    if (M.PrepareDefinesForPrePass(r, s, this.canRenderToMRT && !o), M.PrepareDefinesForOIT(r, s, o), s._areTexturesDirty) {
      this._eventInfo.hasRenderTargetTextures = !1, this._callbackPluginEventHasRenderTargetTextures(this._eventInfo), this._cacheHasRenderTargetTextures = this._eventInfo.hasRenderTargetTextures, s._needUVs = !1;
      for (let f = 1; f <= 6; ++f)
        s["MAINUV" + f] = !1;
      if (r.texturesEnabled) {
        if (s.DIFFUSEDIRECTUV = 0, s.BUMPDIRECTUV = 0, s.AMBIENTDIRECTUV = 0, s.OPACITYDIRECTUV = 0, s.EMISSIVEDIRECTUV = 0, s.SPECULARDIRECTUV = 0, s.LIGHTMAPDIRECTUV = 0, this._diffuseTexture && x.DiffuseTextureEnabled)
          if (this._diffuseTexture.isReadyOrNotBlocking())
            M.PrepareDefinesForMergedUV(this._diffuseTexture, s, "DIFFUSE");
          else
            return !1;
        else
          s.DIFFUSE = !1;
        if (this._ambientTexture && x.AmbientTextureEnabled)
          if (this._ambientTexture.isReadyOrNotBlocking())
            M.PrepareDefinesForMergedUV(this._ambientTexture, s, "AMBIENT");
          else
            return !1;
        else
          s.AMBIENT = !1;
        if (this._opacityTexture && x.OpacityTextureEnabled)
          if (this._opacityTexture.isReadyOrNotBlocking())
            M.PrepareDefinesForMergedUV(this._opacityTexture, s, "OPACITY"), s.OPACITYRGB = this._opacityTexture.getAlphaFromRGB;
          else
            return !1;
        else
          s.OPACITY = !1;
        if (this._reflectionTexture && x.ReflectionTextureEnabled)
          if (this._reflectionTexture.isReadyOrNotBlocking()) {
            switch (s._needNormals = !0, s.REFLECTION = !0, s.ROUGHNESS = this._roughness > 0, s.REFLECTIONOVERALPHA = this._useReflectionOverAlpha, s.INVERTCUBICMAP = this._reflectionTexture.coordinatesMode === I.INVCUBIC_MODE, s.REFLECTIONMAP_3D = this._reflectionTexture.isCube, s.REFLECTIONMAP_OPPOSITEZ = s.REFLECTIONMAP_3D && this.getScene().useRightHandedSystem ? !this._reflectionTexture.invertZ : this._reflectionTexture.invertZ, s.RGBDREFLECTION = this._reflectionTexture.isRGBD, this._reflectionTexture.coordinatesMode) {
              case I.EXPLICIT_MODE:
                s.setReflectionMode("REFLECTIONMAP_EXPLICIT");
                break;
              case I.PLANAR_MODE:
                s.setReflectionMode("REFLECTIONMAP_PLANAR");
                break;
              case I.PROJECTION_MODE:
                s.setReflectionMode("REFLECTIONMAP_PROJECTION");
                break;
              case I.SKYBOX_MODE:
                s.setReflectionMode("REFLECTIONMAP_SKYBOX");
                break;
              case I.SPHERICAL_MODE:
                s.setReflectionMode("REFLECTIONMAP_SPHERICAL");
                break;
              case I.EQUIRECTANGULAR_MODE:
                s.setReflectionMode("REFLECTIONMAP_EQUIRECTANGULAR");
                break;
              case I.FIXED_EQUIRECTANGULAR_MODE:
                s.setReflectionMode("REFLECTIONMAP_EQUIRECTANGULAR_FIXED");
                break;
              case I.FIXED_EQUIRECTANGULAR_MIRRORED_MODE:
                s.setReflectionMode("REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED");
                break;
              case I.CUBIC_MODE:
              case I.INVCUBIC_MODE:
              default:
                s.setReflectionMode("REFLECTIONMAP_CUBIC");
                break;
            }
            s.USE_LOCAL_REFLECTIONMAP_CUBIC = !!this._reflectionTexture.boundingBoxSize;
          } else
            return !1;
        else
          s.REFLECTION = !1, s.REFLECTIONMAP_OPPOSITEZ = !1;
        if (this._emissiveTexture && x.EmissiveTextureEnabled)
          if (this._emissiveTexture.isReadyOrNotBlocking())
            M.PrepareDefinesForMergedUV(this._emissiveTexture, s, "EMISSIVE");
          else
            return !1;
        else
          s.EMISSIVE = !1;
        if (this._lightmapTexture && x.LightmapTextureEnabled)
          if (this._lightmapTexture.isReadyOrNotBlocking())
            M.PrepareDefinesForMergedUV(this._lightmapTexture, s, "LIGHTMAP"), s.USELIGHTMAPASSHADOWMAP = this._useLightmapAsShadowmap, s.RGBDLIGHTMAP = this._lightmapTexture.isRGBD;
          else
            return !1;
        else
          s.LIGHTMAP = !1;
        if (this._specularTexture && x.SpecularTextureEnabled)
          if (this._specularTexture.isReadyOrNotBlocking())
            M.PrepareDefinesForMergedUV(this._specularTexture, s, "SPECULAR"), s.GLOSSINESS = this._useGlossinessFromSpecularMapAlpha;
          else
            return !1;
        else
          s.SPECULAR = !1;
        if (r.getEngine().getCaps().standardDerivatives && this._bumpTexture && x.BumpTextureEnabled) {
          if (this._bumpTexture.isReady())
            M.PrepareDefinesForMergedUV(this._bumpTexture, s, "BUMP"), s.PARALLAX = this._useParallax, s.PARALLAXOCCLUSION = this._useParallaxOcclusion;
          else
            return !1;
          s.OBJECTSPACE_NORMALMAP = this._useObjectSpaceNormalMap;
        } else
          s.BUMP = !1, s.PARALLAX = !1, s.PARALLAXOCCLUSION = !1;
        if (this._refractionTexture && x.RefractionTextureEnabled)
          if (this._refractionTexture.isReadyOrNotBlocking())
            s._needUVs = !0, s.REFRACTION = !0, s.REFRACTIONMAP_3D = this._refractionTexture.isCube, s.RGBDREFRACTION = this._refractionTexture.isRGBD, s.USE_LOCAL_REFRACTIONMAP_CUBIC = !!this._refractionTexture.boundingBoxSize;
          else
            return !1;
        else
          s.REFRACTION = !1;
        s.TWOSIDEDLIGHTING = !this._backFaceCulling && this._twoSidedLighting;
      } else
        s.DIFFUSE = !1, s.AMBIENT = !1, s.OPACITY = !1, s.REFLECTION = !1, s.EMISSIVE = !1, s.LIGHTMAP = !1, s.BUMP = !1, s.REFRACTION = !1;
      s.ALPHAFROMDIFFUSE = this._shouldUseAlphaFromDiffuseTexture(), s.EMISSIVEASILLUMINATION = this._useEmissiveAsIllumination, s.LINKEMISSIVEWITHDIFFUSE = this._linkEmissiveWithDiffuse, s.SPECULAROVERALPHA = this._useSpecularOverAlpha, s.PREMULTIPLYALPHA = this.alphaMode === 7 || this.alphaMode === 8, s.ALPHATEST_AFTERALLALPHACOMPUTATIONS = this.transparencyMode !== null, s.ALPHABLEND = this.transparencyMode === null || this.needAlphaBlendingForMesh(e);
    }
    if (this._eventInfo.isReadyForSubMesh = !0, this._eventInfo.defines = s, this._eventInfo.subMesh = t, this._callbackPluginEventIsReadyForSubMesh(this._eventInfo), !this._eventInfo.isReadyForSubMesh)
      return !1;
    if (s._areImageProcessingDirty && this._imageProcessingConfiguration) {
      if (!this._imageProcessingConfiguration.isReady())
        return !1;
      this._imageProcessingConfiguration.prepareDefines(s), s.IS_REFLECTION_LINEAR = this.reflectionTexture != null && !this.reflectionTexture.gammaSpace, s.IS_REFRACTION_LINEAR = this.refractionTexture != null && !this.refractionTexture.gammaSpace;
    }
    s._areFresnelDirty && (x.FresnelEnabled ? (this._diffuseFresnelParameters || this._opacityFresnelParameters || this._emissiveFresnelParameters || this._refractionFresnelParameters || this._reflectionFresnelParameters) && (s.DIFFUSEFRESNEL = this._diffuseFresnelParameters && this._diffuseFresnelParameters.isEnabled, s.OPACITYFRESNEL = this._opacityFresnelParameters && this._opacityFresnelParameters.isEnabled, s.REFLECTIONFRESNEL = this._reflectionFresnelParameters && this._reflectionFresnelParameters.isEnabled, s.REFLECTIONFRESNELFROMSPECULAR = this._useReflectionFresnelFromSpecular, s.REFRACTIONFRESNEL = this._refractionFresnelParameters && this._refractionFresnelParameters.isEnabled, s.EMISSIVEFRESNEL = this._emissiveFresnelParameters && this._emissiveFresnelParameters.isEnabled, s._needNormals = !0, s.FRESNEL = !0) : s.FRESNEL = !1), M.PrepareDefinesForMisc(e, r, this._useLogarithmicDepth, this.pointsCloud, this.fogEnabled, this._shouldTurnAlphaTestOn(e) || this._forceAlphaTest, s), M.PrepareDefinesForFrameBoundValues(r, n, this, s, i, null, t.getRenderingMesh().hasThinInstances), this._eventInfo.defines = s, this._eventInfo.mesh = e, this._callbackPluginEventPrepareDefinesBeforeAttributes(this._eventInfo), M.PrepareDefinesForAttributes(e, s, !0, !0, !0), this._callbackPluginEventPrepareDefines(this._eventInfo);
    let a = !1;
    if (s.isDirty) {
      const f = s._areLightsDisposed;
      s.markAsProcessed();
      const c = new Ht();
      s.REFLECTION && c.addFallback(0, "REFLECTION"), s.SPECULAR && c.addFallback(0, "SPECULAR"), s.BUMP && c.addFallback(0, "BUMP"), s.PARALLAX && c.addFallback(1, "PARALLAX"), s.PARALLAXOCCLUSION && c.addFallback(0, "PARALLAXOCCLUSION"), s.SPECULAROVERALPHA && c.addFallback(0, "SPECULAROVERALPHA"), s.FOG && c.addFallback(1, "FOG"), s.POINTSIZE && c.addFallback(0, "POINTSIZE"), s.LOGARITHMICDEPTH && c.addFallback(0, "LOGARITHMICDEPTH"), M.HandleFallbacksForShadows(s, c, this._maxSimultaneousLights), s.SPECULARTERM && c.addFallback(0, "SPECULARTERM"), s.DIFFUSEFRESNEL && c.addFallback(1, "DIFFUSEFRESNEL"), s.OPACITYFRESNEL && c.addFallback(2, "OPACITYFRESNEL"), s.REFLECTIONFRESNEL && c.addFallback(3, "REFLECTIONFRESNEL"), s.EMISSIVEFRESNEL && c.addFallback(4, "EMISSIVEFRESNEL"), s.FRESNEL && c.addFallback(4, "FRESNEL"), s.MULTIVIEW && c.addFallback(0, "MULTIVIEW");
      const d = [k.PositionKind];
      s.NORMAL && d.push(k.NormalKind), s.TANGENT && d.push(k.TangentKind);
      for (let L = 1; L <= 6; ++L)
        s["UV" + L] && d.push(`uv${L === 1 ? "" : L}`);
      s.VERTEXCOLOR && d.push(k.ColorKind), M.PrepareAttributesForBones(d, e, s, c), M.PrepareAttributesForInstances(d, s), M.PrepareAttributesForMorphTargets(d, e, s), M.PrepareAttributesForBakedVertexAnimation(d, e, s);
      let E = "default";
      const u = [
        "world",
        "view",
        "viewProjection",
        "vEyePosition",
        "vLightsType",
        "vAmbientColor",
        "vDiffuseColor",
        "vSpecularColor",
        "vEmissiveColor",
        "visibility",
        "vFogInfos",
        "vFogColor",
        "pointSize",
        "vDiffuseInfos",
        "vAmbientInfos",
        "vOpacityInfos",
        "vReflectionInfos",
        "vEmissiveInfos",
        "vSpecularInfos",
        "vBumpInfos",
        "vLightmapInfos",
        "vRefractionInfos",
        "mBones",
        "diffuseMatrix",
        "ambientMatrix",
        "opacityMatrix",
        "reflectionMatrix",
        "emissiveMatrix",
        "specularMatrix",
        "bumpMatrix",
        "normalMatrix",
        "lightmapMatrix",
        "refractionMatrix",
        "diffuseLeftColor",
        "diffuseRightColor",
        "opacityParts",
        "reflectionLeftColor",
        "reflectionRightColor",
        "emissiveLeftColor",
        "emissiveRightColor",
        "refractionLeftColor",
        "refractionRightColor",
        "vReflectionPosition",
        "vReflectionSize",
        "vRefractionPosition",
        "vRefractionSize",
        "logarithmicDepthConstant",
        "vTangentSpaceParams",
        "alphaCutOff",
        "boneTextureWidth",
        "morphTargetTextureInfo",
        "morphTargetTextureIndices"
      ], _ = [
        "diffuseSampler",
        "ambientSampler",
        "opacitySampler",
        "reflectionCubeSampler",
        "reflection2DSampler",
        "emissiveSampler",
        "specularSampler",
        "bumpSampler",
        "lightmapSampler",
        "refractionCubeSampler",
        "refraction2DSampler",
        "boneSampler",
        "morphTargets",
        "oitDepthSampler",
        "oitFrontColorSampler"
      ], p = ["Material", "Scene", "Mesh"];
      this._eventInfo.fallbacks = c, this._eventInfo.fallbackRank = 0, this._eventInfo.defines = s, this._eventInfo.uniforms = u, this._eventInfo.attributes = d, this._eventInfo.samplers = _, this._eventInfo.uniformBuffersNames = p, this._eventInfo.customCode = void 0, this._eventInfo.mesh = e, this._callbackPluginEventGeneric(Ie.PrepareEffect, this._eventInfo), wt.AddUniforms(u), ct && (ct.PrepareUniforms(u, s), ct.PrepareSamplers(_, s)), M.PrepareUniformsAndSamplersList({
        uniformsNames: u,
        uniformBuffersNames: p,
        samplers: _,
        defines: s,
        maxSimultaneousLights: this._maxSimultaneousLights
      }), Ot(u);
      const A = {};
      this.customShaderNameResolve && (E = this.customShaderNameResolve(E, u, p, _, s, d, A));
      const R = s.toString(), N = t.effect;
      let O = r.getEngine().createEffect(E, {
        attributes: d,
        uniformsNames: u,
        uniformBuffersNames: p,
        samplers: _,
        defines: R,
        fallbacks: c,
        onCompiled: this.onCompiled,
        onError: this.onError,
        indexParameters: { maxSimultaneousLights: this._maxSimultaneousLights, maxSimultaneousMorphTargets: s.NUM_MORPH_INFLUENCERS },
        processFinalCode: A.processFinalCode,
        processCodeAfterIncludes: this._eventInfo.customCode,
        multiTarget: s.PREPASS
      }, n);
      if (this._eventInfo.customCode = void 0, O)
        if (this._onEffectCreatedObservable && (ti.effect = O, ti.subMesh = t, this._onEffectCreatedObservable.notifyObservers(ti)), this.allowShaderHotSwapping && N && !O.isReady()) {
          if (O = N, s.markAsUnprocessed(), a = this.isFrozen, f)
            return s._areLightsDisposed = !0, !1;
        } else
          r.resetCachedMaterial(), t.setEffect(O, s, this._materialContext);
    }
    return !t.effect || !t.effect.isReady() ? !1 : (s._renderId = r.getRenderId(), t.effect._wasPreviouslyReady = !a, t.effect._wasPreviouslyUsingInstances = i, this._checkScenePerformancePriority(), !0);
  }
  /**
   * Builds the material UBO layouts.
   * Used internally during the effect preparation.
   */
  buildUniformLayout() {
    const e = this._uniformBuffer;
    e.addUniform("diffuseLeftColor", 4), e.addUniform("diffuseRightColor", 4), e.addUniform("opacityParts", 4), e.addUniform("reflectionLeftColor", 4), e.addUniform("reflectionRightColor", 4), e.addUniform("refractionLeftColor", 4), e.addUniform("refractionRightColor", 4), e.addUniform("emissiveLeftColor", 4), e.addUniform("emissiveRightColor", 4), e.addUniform("vDiffuseInfos", 2), e.addUniform("vAmbientInfos", 2), e.addUniform("vOpacityInfos", 2), e.addUniform("vReflectionInfos", 2), e.addUniform("vReflectionPosition", 3), e.addUniform("vReflectionSize", 3), e.addUniform("vEmissiveInfos", 2), e.addUniform("vLightmapInfos", 2), e.addUniform("vSpecularInfos", 2), e.addUniform("vBumpInfos", 3), e.addUniform("diffuseMatrix", 16), e.addUniform("ambientMatrix", 16), e.addUniform("opacityMatrix", 16), e.addUniform("reflectionMatrix", 16), e.addUniform("emissiveMatrix", 16), e.addUniform("lightmapMatrix", 16), e.addUniform("specularMatrix", 16), e.addUniform("bumpMatrix", 16), e.addUniform("vTangentSpaceParams", 2), e.addUniform("pointSize", 1), e.addUniform("alphaCutOff", 1), e.addUniform("refractionMatrix", 16), e.addUniform("vRefractionInfos", 4), e.addUniform("vRefractionPosition", 3), e.addUniform("vRefractionSize", 3), e.addUniform("vSpecularColor", 4), e.addUniform("vEmissiveColor", 3), e.addUniform("vDiffuseColor", 4), e.addUniform("vAmbientColor", 3), super.buildUniformLayout();
  }
  /**
   * Binds the submesh to this material by preparing the effect and shader to draw
   * @param world defines the world transformation matrix
   * @param mesh defines the mesh containing the submesh
   * @param subMesh defines the submesh to bind the material to
   */
  bindForSubMesh(e, t, i) {
    var r;
    const s = this.getScene(), n = i.materialDefines;
    if (!n)
      return;
    const o = i.effect;
    if (!o)
      return;
    this._activeEffect = o, t.getMeshUniformBuffer().bindToEffect(o, "Mesh"), t.transferToEffect(e), this._uniformBuffer.bindToEffect(o, "Material"), this.prePassConfiguration.bindForSubMesh(this._activeEffect, s, t, e, this.isFrozen), this._eventInfo.subMesh = i, this._callbackPluginEventHardBindForSubMesh(this._eventInfo), n.OBJECTSPACE_NORMALMAP && (e.toNormalMatrix(this._normalMatrix), this.bindOnlyNormalMatrix(this._normalMatrix));
    const a = o._forceRebindOnNextCall || this._mustRebind(s, o, t.visibility);
    M.BindBonesParameters(t, o);
    const f = this._uniformBuffer;
    if (a) {
      if (this.bindViewProjection(o), !f.useUbo || !this.isFrozen || !f.isSync || o._forceRebindOnNextCall) {
        if (x.FresnelEnabled && n.FRESNEL && (this.diffuseFresnelParameters && this.diffuseFresnelParameters.isEnabled && (f.updateColor4("diffuseLeftColor", this.diffuseFresnelParameters.leftColor, this.diffuseFresnelParameters.power), f.updateColor4("diffuseRightColor", this.diffuseFresnelParameters.rightColor, this.diffuseFresnelParameters.bias)), this.opacityFresnelParameters && this.opacityFresnelParameters.isEnabled && f.updateColor4("opacityParts", new K(this.opacityFresnelParameters.leftColor.toLuminance(), this.opacityFresnelParameters.rightColor.toLuminance(), this.opacityFresnelParameters.bias), this.opacityFresnelParameters.power), this.reflectionFresnelParameters && this.reflectionFresnelParameters.isEnabled && (f.updateColor4("reflectionLeftColor", this.reflectionFresnelParameters.leftColor, this.reflectionFresnelParameters.power), f.updateColor4("reflectionRightColor", this.reflectionFresnelParameters.rightColor, this.reflectionFresnelParameters.bias)), this.refractionFresnelParameters && this.refractionFresnelParameters.isEnabled && (f.updateColor4("refractionLeftColor", this.refractionFresnelParameters.leftColor, this.refractionFresnelParameters.power), f.updateColor4("refractionRightColor", this.refractionFresnelParameters.rightColor, this.refractionFresnelParameters.bias)), this.emissiveFresnelParameters && this.emissiveFresnelParameters.isEnabled && (f.updateColor4("emissiveLeftColor", this.emissiveFresnelParameters.leftColor, this.emissiveFresnelParameters.power), f.updateColor4("emissiveRightColor", this.emissiveFresnelParameters.rightColor, this.emissiveFresnelParameters.bias))), s.texturesEnabled) {
          if (this._diffuseTexture && x.DiffuseTextureEnabled && (f.updateFloat2("vDiffuseInfos", this._diffuseTexture.coordinatesIndex, this._diffuseTexture.level), M.BindTextureMatrix(this._diffuseTexture, f, "diffuse")), this._ambientTexture && x.AmbientTextureEnabled && (f.updateFloat2("vAmbientInfos", this._ambientTexture.coordinatesIndex, this._ambientTexture.level), M.BindTextureMatrix(this._ambientTexture, f, "ambient")), this._opacityTexture && x.OpacityTextureEnabled && (f.updateFloat2("vOpacityInfos", this._opacityTexture.coordinatesIndex, this._opacityTexture.level), M.BindTextureMatrix(this._opacityTexture, f, "opacity")), this._hasAlphaChannel() && f.updateFloat("alphaCutOff", this.alphaCutOff), this._reflectionTexture && x.ReflectionTextureEnabled && (f.updateFloat2("vReflectionInfos", this._reflectionTexture.level, this.roughness), f.updateMatrix("reflectionMatrix", this._reflectionTexture.getReflectionTextureMatrix()), this._reflectionTexture.boundingBoxSize)) {
            const c = this._reflectionTexture;
            f.updateVector3("vReflectionPosition", c.boundingBoxPosition), f.updateVector3("vReflectionSize", c.boundingBoxSize);
          }
          if (this._emissiveTexture && x.EmissiveTextureEnabled && (f.updateFloat2("vEmissiveInfos", this._emissiveTexture.coordinatesIndex, this._emissiveTexture.level), M.BindTextureMatrix(this._emissiveTexture, f, "emissive")), this._lightmapTexture && x.LightmapTextureEnabled && (f.updateFloat2("vLightmapInfos", this._lightmapTexture.coordinatesIndex, this._lightmapTexture.level), M.BindTextureMatrix(this._lightmapTexture, f, "lightmap")), this._specularTexture && x.SpecularTextureEnabled && (f.updateFloat2("vSpecularInfos", this._specularTexture.coordinatesIndex, this._specularTexture.level), M.BindTextureMatrix(this._specularTexture, f, "specular")), this._bumpTexture && s.getEngine().getCaps().standardDerivatives && x.BumpTextureEnabled && (f.updateFloat3("vBumpInfos", this._bumpTexture.coordinatesIndex, 1 / this._bumpTexture.level, this.parallaxScaleBias), M.BindTextureMatrix(this._bumpTexture, f, "bump"), s._mirroredCameraPosition ? f.updateFloat2("vTangentSpaceParams", this._invertNormalMapX ? 1 : -1, this._invertNormalMapY ? 1 : -1) : f.updateFloat2("vTangentSpaceParams", this._invertNormalMapX ? -1 : 1, this._invertNormalMapY ? -1 : 1)), this._refractionTexture && x.RefractionTextureEnabled) {
            let c = 1;
            if (this._refractionTexture.isCube || (f.updateMatrix("refractionMatrix", this._refractionTexture.getReflectionTextureMatrix()), this._refractionTexture.depth && (c = this._refractionTexture.depth)), f.updateFloat4("vRefractionInfos", this._refractionTexture.level, this.indexOfRefraction, c, this.invertRefractionY ? -1 : 1), this._refractionTexture.boundingBoxSize) {
              const d = this._refractionTexture;
              f.updateVector3("vRefractionPosition", d.boundingBoxPosition), f.updateVector3("vRefractionSize", d.boundingBoxSize);
            }
          }
        }
        this.pointsCloud && f.updateFloat("pointSize", this.pointSize), n.SPECULARTERM && f.updateColor4("vSpecularColor", this.specularColor, this.specularPower), f.updateColor3("vEmissiveColor", x.EmissiveTextureEnabled ? this.emissiveColor : K.BlackReadOnly), f.updateColor4("vDiffuseColor", this.diffuseColor, this.alpha), s.ambientColor.multiplyToRef(this.ambientColor, this._globalAmbientColor), f.updateColor3("vAmbientColor", this._globalAmbientColor);
      }
      s.texturesEnabled && (this._diffuseTexture && x.DiffuseTextureEnabled && o.setTexture("diffuseSampler", this._diffuseTexture), this._ambientTexture && x.AmbientTextureEnabled && o.setTexture("ambientSampler", this._ambientTexture), this._opacityTexture && x.OpacityTextureEnabled && o.setTexture("opacitySampler", this._opacityTexture), this._reflectionTexture && x.ReflectionTextureEnabled && (this._reflectionTexture.isCube ? o.setTexture("reflectionCubeSampler", this._reflectionTexture) : o.setTexture("reflection2DSampler", this._reflectionTexture)), this._emissiveTexture && x.EmissiveTextureEnabled && o.setTexture("emissiveSampler", this._emissiveTexture), this._lightmapTexture && x.LightmapTextureEnabled && o.setTexture("lightmapSampler", this._lightmapTexture), this._specularTexture && x.SpecularTextureEnabled && o.setTexture("specularSampler", this._specularTexture), this._bumpTexture && s.getEngine().getCaps().standardDerivatives && x.BumpTextureEnabled && o.setTexture("bumpSampler", this._bumpTexture), this._refractionTexture && x.RefractionTextureEnabled && (this._refractionTexture.isCube ? o.setTexture("refractionCubeSampler", this._refractionTexture) : o.setTexture("refraction2DSampler", this._refractionTexture))), this.getScene().useOrderIndependentTransparency && this.needAlphaBlendingForMesh(t) && this.getScene().depthPeelingRenderer.bind(o), this._eventInfo.subMesh = i, this._callbackPluginEventBindForSubMesh(this._eventInfo), Nt(o, this, s), this.bindEyePosition(o);
    } else
      s.getEngine()._features.needToAlwaysBindUniformBuffers && (this._needToBindSceneUbo = !0);
    (a || !this.isFrozen) && (s.lightsEnabled && !this._disableLighting && M.BindLights(s, t, o, n, this._maxSimultaneousLights), (s.fogEnabled && t.applyFog && s.fogMode !== xt.FOGMODE_NONE || this._reflectionTexture || this._refractionTexture || t.receiveShadows || n.PREPASS) && this.bindView(o), M.BindFogParameters(s, t, o), n.NUM_MORPH_INFLUENCERS && M.BindMorphTargetParameters(t, o), n.BAKED_VERTEX_ANIMATION_TEXTURE && ((r = t.bakedVertexAnimationManager) === null || r === void 0 || r.bind(o, n.INSTANCES)), this.useLogarithmicDepth && M.BindLogDepth(n, o, s), this._imageProcessingConfiguration && !this._imageProcessingConfiguration.applyByPostProcess && this._imageProcessingConfiguration.bind(this._activeEffect)), this._afterBind(t, this._activeEffect), f.update();
  }
  /**
   * Get the list of animatables in the material.
   * @returns the list of animatables object used in the material
   */
  getAnimatables() {
    const e = super.getAnimatables();
    return this._diffuseTexture && this._diffuseTexture.animations && this._diffuseTexture.animations.length > 0 && e.push(this._diffuseTexture), this._ambientTexture && this._ambientTexture.animations && this._ambientTexture.animations.length > 0 && e.push(this._ambientTexture), this._opacityTexture && this._opacityTexture.animations && this._opacityTexture.animations.length > 0 && e.push(this._opacityTexture), this._reflectionTexture && this._reflectionTexture.animations && this._reflectionTexture.animations.length > 0 && e.push(this._reflectionTexture), this._emissiveTexture && this._emissiveTexture.animations && this._emissiveTexture.animations.length > 0 && e.push(this._emissiveTexture), this._specularTexture && this._specularTexture.animations && this._specularTexture.animations.length > 0 && e.push(this._specularTexture), this._bumpTexture && this._bumpTexture.animations && this._bumpTexture.animations.length > 0 && e.push(this._bumpTexture), this._lightmapTexture && this._lightmapTexture.animations && this._lightmapTexture.animations.length > 0 && e.push(this._lightmapTexture), this._refractionTexture && this._refractionTexture.animations && this._refractionTexture.animations.length > 0 && e.push(this._refractionTexture), e;
  }
  /**
   * Gets the active textures from the material
   * @returns an array of textures
   */
  getActiveTextures() {
    const e = super.getActiveTextures();
    return this._diffuseTexture && e.push(this._diffuseTexture), this._ambientTexture && e.push(this._ambientTexture), this._opacityTexture && e.push(this._opacityTexture), this._reflectionTexture && e.push(this._reflectionTexture), this._emissiveTexture && e.push(this._emissiveTexture), this._specularTexture && e.push(this._specularTexture), this._bumpTexture && e.push(this._bumpTexture), this._lightmapTexture && e.push(this._lightmapTexture), this._refractionTexture && e.push(this._refractionTexture), e;
  }
  /**
   * Specifies if the material uses a texture
   * @param texture defines the texture to check against the material
   * @returns a boolean specifying if the material uses the texture
   */
  hasTexture(e) {
    return !!(super.hasTexture(e) || this._diffuseTexture === e || this._ambientTexture === e || this._opacityTexture === e || this._reflectionTexture === e || this._emissiveTexture === e || this._specularTexture === e || this._bumpTexture === e || this._lightmapTexture === e || this._refractionTexture === e);
  }
  /**
   * Disposes the material
   * @param forceDisposeEffect specifies if effects should be forcefully disposed
   * @param forceDisposeTextures specifies if textures should be forcefully disposed
   */
  dispose(e, t) {
    var i, r, s, n, o, a, f, c, d;
    t && ((i = this._diffuseTexture) === null || i === void 0 || i.dispose(), (r = this._ambientTexture) === null || r === void 0 || r.dispose(), (s = this._opacityTexture) === null || s === void 0 || s.dispose(), (n = this._reflectionTexture) === null || n === void 0 || n.dispose(), (o = this._emissiveTexture) === null || o === void 0 || o.dispose(), (a = this._specularTexture) === null || a === void 0 || a.dispose(), (f = this._bumpTexture) === null || f === void 0 || f.dispose(), (c = this._lightmapTexture) === null || c === void 0 || c.dispose(), (d = this._refractionTexture) === null || d === void 0 || d.dispose()), this._imageProcessingConfiguration && this._imageProcessingObserver && this._imageProcessingConfiguration.onUpdateParameters.remove(this._imageProcessingObserver), super.dispose(e, t);
  }
  /**
   * Makes a duplicate of the material, and gives it a new name
   * @param name defines the new name for the duplicated material
   * @returns the cloned material
   */
  clone(e) {
    const t = j.Clone(() => new x(e, this.getScene()), this);
    return t.name = e, t.id = e, this.stencil.copyTo(t.stencil), t;
  }
  /**
   * Creates a standard material from parsed material data
   * @param source defines the JSON representation of the material
   * @param scene defines the hosting scene
   * @param rootUrl defines the root URL to use to load textures and relative dependencies
   * @returns a new standard material
   */
  static Parse(e, t, i) {
    const r = j.Parse(() => new x(e.name, t), e, t, i);
    return e.stencil && r.stencil.parse(e.stencil, t, i), r;
  }
  // Flags used to enable or disable a type of texture for all Standard Materials
  /**
   * Are diffuse textures enabled in the application.
   */
  static get DiffuseTextureEnabled() {
    return S.DiffuseTextureEnabled;
  }
  static set DiffuseTextureEnabled(e) {
    S.DiffuseTextureEnabled = e;
  }
  /**
   * Are detail textures enabled in the application.
   */
  static get DetailTextureEnabled() {
    return S.DetailTextureEnabled;
  }
  static set DetailTextureEnabled(e) {
    S.DetailTextureEnabled = e;
  }
  /**
   * Are ambient textures enabled in the application.
   */
  static get AmbientTextureEnabled() {
    return S.AmbientTextureEnabled;
  }
  static set AmbientTextureEnabled(e) {
    S.AmbientTextureEnabled = e;
  }
  /**
   * Are opacity textures enabled in the application.
   */
  static get OpacityTextureEnabled() {
    return S.OpacityTextureEnabled;
  }
  static set OpacityTextureEnabled(e) {
    S.OpacityTextureEnabled = e;
  }
  /**
   * Are reflection textures enabled in the application.
   */
  static get ReflectionTextureEnabled() {
    return S.ReflectionTextureEnabled;
  }
  static set ReflectionTextureEnabled(e) {
    S.ReflectionTextureEnabled = e;
  }
  /**
   * Are emissive textures enabled in the application.
   */
  static get EmissiveTextureEnabled() {
    return S.EmissiveTextureEnabled;
  }
  static set EmissiveTextureEnabled(e) {
    S.EmissiveTextureEnabled = e;
  }
  /**
   * Are specular textures enabled in the application.
   */
  static get SpecularTextureEnabled() {
    return S.SpecularTextureEnabled;
  }
  static set SpecularTextureEnabled(e) {
    S.SpecularTextureEnabled = e;
  }
  /**
   * Are bump textures enabled in the application.
   */
  static get BumpTextureEnabled() {
    return S.BumpTextureEnabled;
  }
  static set BumpTextureEnabled(e) {
    S.BumpTextureEnabled = e;
  }
  /**
   * Are lightmap textures enabled in the application.
   */
  static get LightmapTextureEnabled() {
    return S.LightmapTextureEnabled;
  }
  static set LightmapTextureEnabled(e) {
    S.LightmapTextureEnabled = e;
  }
  /**
   * Are refraction textures enabled in the application.
   */
  static get RefractionTextureEnabled() {
    return S.RefractionTextureEnabled;
  }
  static set RefractionTextureEnabled(e) {
    S.RefractionTextureEnabled = e;
  }
  /**
   * Are color grading textures enabled in the application.
   */
  static get ColorGradingTextureEnabled() {
    return S.ColorGradingTextureEnabled;
  }
  static set ColorGradingTextureEnabled(e) {
    S.ColorGradingTextureEnabled = e;
  }
  /**
   * Are fresnels enabled in the application.
   */
  static get FresnelEnabled() {
    return S.FresnelEnabled;
  }
  static set FresnelEnabled(e) {
    S.FresnelEnabled = e;
  }
}
h([
  z("diffuseTexture")
], x.prototype, "_diffuseTexture", void 0);
h([
  v("_markAllSubMeshesAsTexturesAndMiscDirty")
], x.prototype, "diffuseTexture", void 0);
h([
  z("ambientTexture")
], x.prototype, "_ambientTexture", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], x.prototype, "ambientTexture", void 0);
h([
  z("opacityTexture")
], x.prototype, "_opacityTexture", void 0);
h([
  v("_markAllSubMeshesAsTexturesAndMiscDirty")
], x.prototype, "opacityTexture", void 0);
h([
  z("reflectionTexture")
], x.prototype, "_reflectionTexture", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], x.prototype, "reflectionTexture", void 0);
h([
  z("emissiveTexture")
], x.prototype, "_emissiveTexture", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], x.prototype, "emissiveTexture", void 0);
h([
  z("specularTexture")
], x.prototype, "_specularTexture", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], x.prototype, "specularTexture", void 0);
h([
  z("bumpTexture")
], x.prototype, "_bumpTexture", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], x.prototype, "bumpTexture", void 0);
h([
  z("lightmapTexture")
], x.prototype, "_lightmapTexture", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], x.prototype, "lightmapTexture", void 0);
h([
  z("refractionTexture")
], x.prototype, "_refractionTexture", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], x.prototype, "refractionTexture", void 0);
h([
  ce("ambient")
], x.prototype, "ambientColor", void 0);
h([
  ce("diffuse")
], x.prototype, "diffuseColor", void 0);
h([
  ce("specular")
], x.prototype, "specularColor", void 0);
h([
  ce("emissive")
], x.prototype, "emissiveColor", void 0);
h([
  T()
], x.prototype, "specularPower", void 0);
h([
  T("useAlphaFromDiffuseTexture")
], x.prototype, "_useAlphaFromDiffuseTexture", void 0);
h([
  v("_markAllSubMeshesAsTexturesAndMiscDirty")
], x.prototype, "useAlphaFromDiffuseTexture", void 0);
h([
  T("useEmissiveAsIllumination")
], x.prototype, "_useEmissiveAsIllumination", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], x.prototype, "useEmissiveAsIllumination", void 0);
h([
  T("linkEmissiveWithDiffuse")
], x.prototype, "_linkEmissiveWithDiffuse", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], x.prototype, "linkEmissiveWithDiffuse", void 0);
h([
  T("useSpecularOverAlpha")
], x.prototype, "_useSpecularOverAlpha", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], x.prototype, "useSpecularOverAlpha", void 0);
h([
  T("useReflectionOverAlpha")
], x.prototype, "_useReflectionOverAlpha", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], x.prototype, "useReflectionOverAlpha", void 0);
h([
  T("disableLighting")
], x.prototype, "_disableLighting", void 0);
h([
  v("_markAllSubMeshesAsLightsDirty")
], x.prototype, "disableLighting", void 0);
h([
  T("useObjectSpaceNormalMap")
], x.prototype, "_useObjectSpaceNormalMap", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], x.prototype, "useObjectSpaceNormalMap", void 0);
h([
  T("useParallax")
], x.prototype, "_useParallax", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], x.prototype, "useParallax", void 0);
h([
  T("useParallaxOcclusion")
], x.prototype, "_useParallaxOcclusion", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], x.prototype, "useParallaxOcclusion", void 0);
h([
  T()
], x.prototype, "parallaxScaleBias", void 0);
h([
  T("roughness")
], x.prototype, "_roughness", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], x.prototype, "roughness", void 0);
h([
  T()
], x.prototype, "indexOfRefraction", void 0);
h([
  T()
], x.prototype, "invertRefractionY", void 0);
h([
  T()
], x.prototype, "alphaCutOff", void 0);
h([
  T("useLightmapAsShadowmap")
], x.prototype, "_useLightmapAsShadowmap", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], x.prototype, "useLightmapAsShadowmap", void 0);
h([
  Lt("diffuseFresnelParameters")
], x.prototype, "_diffuseFresnelParameters", void 0);
h([
  v("_markAllSubMeshesAsFresnelDirty")
], x.prototype, "diffuseFresnelParameters", void 0);
h([
  Lt("opacityFresnelParameters")
], x.prototype, "_opacityFresnelParameters", void 0);
h([
  v("_markAllSubMeshesAsFresnelAndMiscDirty")
], x.prototype, "opacityFresnelParameters", void 0);
h([
  Lt("reflectionFresnelParameters")
], x.prototype, "_reflectionFresnelParameters", void 0);
h([
  v("_markAllSubMeshesAsFresnelDirty")
], x.prototype, "reflectionFresnelParameters", void 0);
h([
  Lt("refractionFresnelParameters")
], x.prototype, "_refractionFresnelParameters", void 0);
h([
  v("_markAllSubMeshesAsFresnelDirty")
], x.prototype, "refractionFresnelParameters", void 0);
h([
  Lt("emissiveFresnelParameters")
], x.prototype, "_emissiveFresnelParameters", void 0);
h([
  v("_markAllSubMeshesAsFresnelDirty")
], x.prototype, "emissiveFresnelParameters", void 0);
h([
  T("useReflectionFresnelFromSpecular")
], x.prototype, "_useReflectionFresnelFromSpecular", void 0);
h([
  v("_markAllSubMeshesAsFresnelDirty")
], x.prototype, "useReflectionFresnelFromSpecular", void 0);
h([
  T("useGlossinessFromSpecularMapAlpha")
], x.prototype, "_useGlossinessFromSpecularMapAlpha", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], x.prototype, "useGlossinessFromSpecularMapAlpha", void 0);
h([
  T("maxSimultaneousLights")
], x.prototype, "_maxSimultaneousLights", void 0);
h([
  v("_markAllSubMeshesAsLightsDirty")
], x.prototype, "maxSimultaneousLights", void 0);
h([
  T("invertNormalMapX")
], x.prototype, "_invertNormalMapX", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], x.prototype, "invertNormalMapX", void 0);
h([
  T("invertNormalMapY")
], x.prototype, "_invertNormalMapY", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], x.prototype, "invertNormalMapY", void 0);
h([
  T("twoSidedLighting")
], x.prototype, "_twoSidedLighting", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], x.prototype, "twoSidedLighting", void 0);
h([
  T()
], x.prototype, "useLogarithmicDepth", null);
Fe("BABYLON.StandardMaterial", x);
xt.DefaultMaterialFactory = (l) => new x("default material", l);
const Xa = "imageProcessingCompatibility", Ha = `#ifdef IMAGEPROCESSINGPOSTPROCESS
gl_FragColor.rgb=pow(gl_FragColor.rgb,vec3(2.2));
#endif
`;
C.IncludesShadersStore[Xa] = Ha;
const ka = "shadowOnlyPixelShader", za = `precision highp float;
uniform vec4 vEyePosition;
uniform float alpha;
uniform vec3 shadowColor;
varying vec3 vPositionW;
#ifdef NORMAL
varying vec3 vNormalW;
#endif
#include<helperFunctions>
#include<__decl__lightFragment>[0..maxSimultaneousLights]
#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>
#include<clipPlaneFragmentDeclaration>
#include<fogFragmentDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
vec3 viewDirectionW=normalize(vEyePosition.xyz-vPositionW);
#ifdef NORMAL
vec3 normalW=normalize(vNormalW);
#else
vec3 normalW=vec3(1.0,1.0,1.0);
#endif
vec3 diffuseBase=vec3(0.,0.,0.);
lightingInfo info;
float shadow=1.;
float glossiness=0.;
#include<lightFragment>[0..1]
vec4 color=vec4(shadowColor,(1.0-clamp(shadow,0.,1.))*alpha);
#include<fogFragment>
gl_FragColor=color;
#include<imageProcessingCompatibility>
#define CUSTOM_FRAGMENT_MAIN_END
}`;
C.ShadersStore[ka] = za;
const Wa = "shadowOnlyVertexShader", Ya = `precision highp float;
attribute vec3 position;
#ifdef NORMAL
attribute vec3 normal;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
uniform mat4 view;
uniform mat4 viewProjection;
#ifdef POINTSIZE
uniform float pointSize;
#endif
varying vec3 vPositionW;
#ifdef NORMAL
varying vec3 vNormalW;
#endif
#ifdef VERTEXCOLOR
varying vec4 vColor;
#endif
#include<clipPlaneVertexDeclaration>
#include<fogVertexDeclaration>
#include<__decl__lightFragment>[0..maxSimultaneousLights]
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(position,1.0);
gl_Position=viewProjection*worldPos;
vPositionW=vec3(worldPos);
#ifdef NORMAL
vNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));
#endif
#include<clipPlaneVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#if defined(POINTSIZE) && !defined(WEBGPU)
gl_PointSize=pointSize;
#endif
#define CUSTOM_VERTEX_MAIN_END
}
`;
C.ShadersStore[Wa] = Ya;
class Qa extends ye {
  constructor() {
    super(), this.CLIPPLANE = !1, this.CLIPPLANE2 = !1, this.CLIPPLANE3 = !1, this.CLIPPLANE4 = !1, this.CLIPPLANE5 = !1, this.CLIPPLANE6 = !1, this.POINTSIZE = !1, this.FOG = !1, this.NORMAL = !1, this.NUM_BONE_INFLUENCERS = 0, this.BonesPerMesh = 0, this.INSTANCES = !1, this.IMAGEPROCESSINGPOSTPROCESS = !1, this.SKIPFINALCOLORCLAMP = !1, this.rebuild();
  }
}
class Rt extends di {
  constructor(e, t) {
    super(e, t), this._needAlphaBlending = !0, this.shadowColor = K.Black();
  }
  needAlphaBlending() {
    return this._needAlphaBlending;
  }
  needAlphaTesting() {
    return !1;
  }
  getAlphaTestTexture() {
    return null;
  }
  get activeLight() {
    return this._activeLight;
  }
  set activeLight(e) {
    this._activeLight = e;
  }
  _getFirstShadowLightForMesh(e) {
    for (const t of e.lightSources)
      if (t.shadowEnabled)
        return t;
    return null;
  }
  // Methods
  isReadyForSubMesh(e, t, i) {
    var r;
    if (this.isFrozen && t.effect && t.effect._wasPreviouslyReady && t.effect._wasPreviouslyUsingInstances === i)
      return !0;
    t.materialDefines || (t.materialDefines = new Qa());
    const s = t.materialDefines, n = this.getScene();
    if (this._isReadyForSubMesh(t))
      return !0;
    const o = n.getEngine();
    if (this._activeLight) {
      for (const f of e.lightSources)
        if (f.shadowEnabled) {
          if (this._activeLight === f)
            break;
          const c = e.lightSources.indexOf(this._activeLight);
          c !== -1 && (e.lightSources.splice(c, 1), e.lightSources.splice(0, 0, this._activeLight));
          break;
        }
    }
    M.PrepareDefinesForFrameBoundValues(n, o, this, s, !!i), M.PrepareDefinesForMisc(e, n, !1, this.pointsCloud, this.fogEnabled, this._shouldTurnAlphaTestOn(e), s), s._needNormals = M.PrepareDefinesForLights(n, e, s, !1, 1);
    const a = (r = this._getFirstShadowLightForMesh(e)) === null || r === void 0 ? void 0 : r.getShadowGenerator();
    if (this._needAlphaBlending = !0, a && a.getClassName && a.getClassName() === "CascadedShadowGenerator") {
      const f = a;
      this._needAlphaBlending = !f.autoCalcDepthBounds;
    }
    if (M.PrepareDefinesForAttributes(e, s, !1, !0), s.isDirty) {
      s.markAsProcessed(), n.resetCachedMaterial();
      const f = new Ht();
      s.FOG && f.addFallback(1, "FOG"), M.HandleFallbacksForShadows(s, f, 1), s.NUM_BONE_INFLUENCERS > 0 && f.addCPUSkinningFallback(0, e), s.IMAGEPROCESSINGPOSTPROCESS = n.imageProcessingConfiguration.applyByPostProcess;
      const c = [k.PositionKind];
      s.NORMAL && c.push(k.NormalKind), M.PrepareAttributesForBones(c, e, s, f), M.PrepareAttributesForInstances(c, s);
      const d = "shadowOnly", E = s.toString(), u = ["world", "view", "viewProjection", "vEyePosition", "vLightsType", "vFogInfos", "vFogColor", "pointSize", "alpha", "shadowColor", "mBones"], _ = new Array(), p = new Array();
      Ot(u), M.PrepareUniformsAndSamplersList({
        uniformsNames: u,
        uniformBuffersNames: p,
        samplers: _,
        defines: s,
        maxSimultaneousLights: 1
      }), t.setEffect(n.getEngine().createEffect(d, {
        attributes: c,
        uniformsNames: u,
        uniformBuffersNames: p,
        samplers: _,
        defines: E,
        fallbacks: f,
        onCompiled: this.onCompiled,
        onError: this.onError,
        indexParameters: { maxSimultaneousLights: 1 }
      }, o), s, this._materialContext);
    }
    return !t.effect || !t.effect.isReady() ? !1 : (s._renderId = n.getRenderId(), t.effect._wasPreviouslyReady = !0, t.effect._wasPreviouslyUsingInstances = !!i, !0);
  }
  bindForSubMesh(e, t, i) {
    const r = this.getScene(), s = i.materialDefines;
    if (!s)
      return;
    const n = i.effect;
    if (n) {
      if (this._activeEffect = n, this.bindOnlyWorldMatrix(e), this._activeEffect.setMatrix("viewProjection", r.getTransformMatrix()), M.BindBonesParameters(t, this._activeEffect), this._mustRebind(r, n) && (Nt(n, this, r), this.pointsCloud && this._activeEffect.setFloat("pointSize", this.pointSize), this._activeEffect.setFloat("alpha", this.alpha), this._activeEffect.setColor3("shadowColor", this.shadowColor), r.bindEyePosition(n)), r.lightsEnabled) {
        M.BindLights(r, t, this._activeEffect, s, 1);
        const o = this._getFirstShadowLightForMesh(t);
        o && (o._renderId = -1);
      }
      (r.fogEnabled && t.applyFog && r.fogMode !== xt.FOGMODE_NONE || s.SHADOWCSM0) && this._activeEffect.setMatrix("view", r.getViewMatrix()), M.BindFogParameters(r, t, this._activeEffect), this._afterBind(t, this._activeEffect);
    }
  }
  clone(e) {
    return j.Clone(() => new Rt(e, this.getScene()), this);
  }
  serialize() {
    const e = super.serialize();
    return e.customType = "BABYLON.ShadowOnlyMaterial", e;
  }
  getClassName() {
    return "ShadowOnlyMaterial";
  }
  // Statics
  static Parse(e, t, i) {
    return j.Parse(() => new Rt(e.name, t), e, t, i);
  }
}
Fe("BABYLON.ShadowOnlyMaterial", Rt);
const Ka = {
  aspect: 300 / 150,
  enableDebugging: !1,
  enableShadows: !0
};
class Za {
  constructor(e) {
    We(this, "size", 9.5);
    this.config = { ...Ka, ...e }, this.create();
  }
  create(e) {
    this.destroy(), Object.assign(this.config, e);
    const { aspect: t, enableDebugging: i, enableShadows: r } = this.config, s = 30;
    this.box = new nr("diceBox");
    let n = new Rt("shadowOnly", this.config.scene);
    n.alpha = r ? 1 : 0, i && (n = new x("diceBox_material"), n.alpha = 0.7, n.diffuseColor = new K(1, 1, 0));
    const o = lt("ground", {
      width: this.size * 2,
      height: 1,
      depth: this.size * 2
    }, this.config.scene);
    if (o.scaling = new g(t, 1, 1), o.material = n, o.receiveShadows = !0, o.setParent(this.box), i) {
      const a = lt("wallTop", {
        width: this.size,
        height: s,
        depth: 1
      }, this.config.scene);
      a.position.y = s / 2, a.position.z = this.size / -2, a.scaling = new g(t, 1, 1), a.material = n, a.setParent(this.box);
      const f = lt("wallRight", {
        width: 1,
        height: s,
        depth: this.size
      }, this.config.scene);
      f.position.x = this.size * t / 2, f.position.y = s / 2, f.material = n, f.setParent(this.box);
      const c = lt("wallBottom", {
        width: this.size,
        height: s,
        depth: 1
      }, this.config.scene);
      c.position.y = s / 2, c.position.z = this.size / 2, c.scaling = new g(t, 1, 1), c.material = n, c.setParent(this.box);
      const d = lt("wallLeft", {
        width: 1,
        height: s,
        depth: this.size
      }, this.config.scene);
      d.position.x = this.size * t / -2, d.position.y = s / 2, d.material = n, d.setParent(this.box);
    }
  }
  destroy() {
    this.box && this.box.dispose();
  }
}
class ja {
  constructor() {
  }
}
class qe extends x {
  AttachAfterBind(e, t) {
    if (this._newUniformInstances)
      for (const i in this._newUniformInstances) {
        const r = i.toString().split("-");
        r[0] == "vec2" ? t.setVector2(r[1], this._newUniformInstances[i]) : r[0] == "vec3" ? t.setVector3(r[1], this._newUniformInstances[i]) : r[0] == "vec4" ? t.setVector4(r[1], this._newUniformInstances[i]) : r[0] == "mat4" ? t.setMatrix(r[1], this._newUniformInstances[i]) : r[0] == "float" && t.setFloat(r[1], this._newUniformInstances[i]);
      }
    if (this._newSamplerInstances)
      for (const i in this._newSamplerInstances) {
        const r = i.toString().split("-");
        r[0] == "sampler2D" && this._newSamplerInstances[i].isReady && this._newSamplerInstances[i].isReady() && t.setTexture(r[1], this._newSamplerInstances[i]);
      }
  }
  ReviewUniform(e, t) {
    if (e == "uniform" && this._newUniforms)
      for (let i = 0; i < this._newUniforms.length; i++)
        this._customUniform[i].indexOf("sampler") == -1 && t.push(this._newUniforms[i].replace(/\[\d*\]/g, ""));
    if (e == "sampler" && this._newUniforms)
      for (let i = 0; i < this._newUniforms.length; i++)
        this._customUniform[i].indexOf("sampler") != -1 && t.push(this._newUniforms[i].replace(/\[\d*\]/g, ""));
    return t;
  }
  Builder(e, t, i, r, s, n) {
    if (n && this._customAttributes && this._customAttributes.length > 0 && n.push(...this._customAttributes), this.ReviewUniform("uniform", t), this.ReviewUniform("sampler", r), this._isCreatedShader)
      return this._createdShaderName;
    this._isCreatedShader = !1, qe.ShaderIndexer++;
    const o = "custom_" + qe.ShaderIndexer, a = this._afterBind.bind(this);
    return this._afterBind = (f, c) => {
      if (c) {
        this.AttachAfterBind(f, c);
        try {
          a(f, c);
        } catch {
        }
      }
    }, ne.ShadersStore[o + "VertexShader"] = this.VertexShader.replace("#define CUSTOM_VERTEX_BEGIN", this.CustomParts.Vertex_Begin ? this.CustomParts.Vertex_Begin : "").replace("#define CUSTOM_VERTEX_DEFINITIONS", (this._customUniform ? this._customUniform.join(`
`) : "") + (this.CustomParts.Vertex_Definitions ? this.CustomParts.Vertex_Definitions : "")).replace("#define CUSTOM_VERTEX_MAIN_BEGIN", this.CustomParts.Vertex_MainBegin ? this.CustomParts.Vertex_MainBegin : "").replace("#define CUSTOM_VERTEX_UPDATE_POSITION", this.CustomParts.Vertex_Before_PositionUpdated ? this.CustomParts.Vertex_Before_PositionUpdated : "").replace("#define CUSTOM_VERTEX_UPDATE_NORMAL", this.CustomParts.Vertex_Before_NormalUpdated ? this.CustomParts.Vertex_Before_NormalUpdated : "").replace("#define CUSTOM_VERTEX_MAIN_END", this.CustomParts.Vertex_MainEnd ? this.CustomParts.Vertex_MainEnd : ""), this.CustomParts.Vertex_After_WorldPosComputed && (ne.ShadersStore[o + "VertexShader"] = ne.ShadersStore[o + "VertexShader"].replace("#define CUSTOM_VERTEX_UPDATE_WORLDPOS", this.CustomParts.Vertex_After_WorldPosComputed)), ne.ShadersStore[o + "PixelShader"] = this.FragmentShader.replace("#define CUSTOM_FRAGMENT_BEGIN", this.CustomParts.Fragment_Begin ? this.CustomParts.Fragment_Begin : "").replace("#define CUSTOM_FRAGMENT_MAIN_BEGIN", this.CustomParts.Fragment_MainBegin ? this.CustomParts.Fragment_MainBegin : "").replace("#define CUSTOM_FRAGMENT_DEFINITIONS", (this._customUniform ? this._customUniform.join(`
`) : "") + (this.CustomParts.Fragment_Definitions ? this.CustomParts.Fragment_Definitions : "")).replace("#define CUSTOM_FRAGMENT_UPDATE_DIFFUSE", this.CustomParts.Fragment_Custom_Diffuse ? this.CustomParts.Fragment_Custom_Diffuse : "").replace("#define CUSTOM_FRAGMENT_UPDATE_ALPHA", this.CustomParts.Fragment_Custom_Alpha ? this.CustomParts.Fragment_Custom_Alpha : "").replace("#define CUSTOM_FRAGMENT_BEFORE_LIGHTS", this.CustomParts.Fragment_Before_Lights ? this.CustomParts.Fragment_Before_Lights : "").replace("#define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR", this.CustomParts.Fragment_Before_FragColor ? this.CustomParts.Fragment_Before_FragColor : "").replace("#define CUSTOM_FRAGMENT_MAIN_END", this.CustomParts.Fragment_MainEnd ? this.CustomParts.Fragment_MainEnd : ""), this.CustomParts.Fragment_Before_Fog && (ne.ShadersStore[o + "PixelShader"] = ne.ShadersStore[o + "PixelShader"].replace("#define CUSTOM_FRAGMENT_BEFORE_FOG", this.CustomParts.Fragment_Before_Fog)), this._isCreatedShader = !0, this._createdShaderName = o, o;
  }
  constructor(e, t) {
    super(e, t), this.CustomParts = new ja(), this.customShaderNameResolve = this.Builder, this.FragmentShader = ne.ShadersStore.defaultPixelShader, this.VertexShader = ne.ShadersStore.defaultVertexShader;
  }
  AddUniform(e, t, i) {
    return this._customUniform || (this._customUniform = new Array(), this._newUniforms = new Array(), this._newSamplerInstances = {}, this._newUniformInstances = {}), i && (t.indexOf("sampler") != -1 ? this._newSamplerInstances[t + "-" + e] = i : this._newUniformInstances[t + "-" + e] = i), this._customUniform.push("uniform " + t + " " + e + ";"), this._newUniforms.push(e), this;
  }
  AddAttribute(e) {
    return this._customAttributes || (this._customAttributes = []), this._customAttributes.push(e), this;
  }
  Fragment_Begin(e) {
    return this.CustomParts.Fragment_Begin = e, this;
  }
  Fragment_Definitions(e) {
    return this.CustomParts.Fragment_Definitions = e, this;
  }
  Fragment_MainBegin(e) {
    return this.CustomParts.Fragment_MainBegin = e, this;
  }
  Fragment_MainEnd(e) {
    return this.CustomParts.Fragment_MainEnd = e, this;
  }
  Fragment_Custom_Diffuse(e) {
    return this.CustomParts.Fragment_Custom_Diffuse = e.replace("result", "diffuseColor"), this;
  }
  Fragment_Custom_Alpha(e) {
    return this.CustomParts.Fragment_Custom_Alpha = e.replace("result", "alpha"), this;
  }
  Fragment_Before_Lights(e) {
    return this.CustomParts.Fragment_Before_Lights = e, this;
  }
  Fragment_Before_Fog(e) {
    return this.CustomParts.Fragment_Before_Fog = e, this;
  }
  Fragment_Before_FragColor(e) {
    return this.CustomParts.Fragment_Before_FragColor = e.replace("result", "color"), this;
  }
  Vertex_Begin(e) {
    return this.CustomParts.Vertex_Begin = e, this;
  }
  Vertex_Definitions(e) {
    return this.CustomParts.Vertex_Definitions = e, this;
  }
  Vertex_MainBegin(e) {
    return this.CustomParts.Vertex_MainBegin = e, this;
  }
  Vertex_Before_PositionUpdated(e) {
    return this.CustomParts.Vertex_Before_PositionUpdated = e.replace("result", "positionUpdated"), this;
  }
  Vertex_Before_NormalUpdated(e) {
    return this.CustomParts.Vertex_Before_NormalUpdated = e.replace("result", "normalUpdated"), this;
  }
  Vertex_After_WorldPosComputed(e) {
    return this.CustomParts.Vertex_After_WorldPosComputed = e, this;
  }
  Vertex_MainEnd(e) {
    return this.CustomParts.Vertex_MainEnd = e, this;
  }
}
qe.ShaderIndexer = 1;
Fe("BABYLON.CustomMaterial", qe);
const qa = "rgbdDecodePixelShader", Ja = `varying vec2 vUV;
uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{
gl_FragColor=vec4(fromRGBD(texture2D(textureSampler,vUV)),1.0);
}`;
C.ShadersStore[qa] = Ja;
const $a = "passCubePixelShader", eo = `varying vec2 vUV;
uniform samplerCube textureSampler;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{
vec2 uv=vUV*2.0-1.0;
#ifdef POSITIVEX
gl_FragColor=textureCube(textureSampler,vec3(1.001,uv.y,uv.x));
#endif
#ifdef NEGATIVEX
gl_FragColor=textureCube(textureSampler,vec3(-1.001,uv.y,uv.x));
#endif
#ifdef POSITIVEY
gl_FragColor=textureCube(textureSampler,vec3(uv.y,1.001,uv.x));
#endif
#ifdef NEGATIVEY
gl_FragColor=textureCube(textureSampler,vec3(uv.y,-1.001,uv.x));
#endif
#ifdef POSITIVEZ
gl_FragColor=textureCube(textureSampler,vec3(uv,1.001));
#endif
#ifdef NEGATIVEZ
gl_FragColor=textureCube(textureSampler,vec3(uv,-1.001));
#endif
}`;
C.ShadersStore[$a] = eo;
class zt extends W {
  /**
   * Gets a string identifying the name of the class
   * @returns "PassPostProcess" string
   */
  getClassName() {
    return "PassPostProcess";
  }
  /**
   * Creates the PassPostProcess
   * @param name The name of the effect.
   * @param options The required width/height ratio to downsize to before computing the render pass.
   * @param camera The camera to apply the render pass to.
   * @param samplingMode The sampling mode to be used when computing the pass. (default: 0)
   * @param engine The engine which the post process will be applied. (default: current engine)
   * @param reusable If the post process can be reused on the same frame. (default: false)
   * @param textureType The type of texture to be used when performing the post processing.
   * @param blockCompilation If compilation of the shader should not be done in the constructor. The updateEffect method can be used to compile the shader at a later time. (default: false)
   */
  constructor(e, t, i = null, r, s, n, o = 0, a = !1) {
    super(e, "pass", null, null, t, i, r, s, n, void 0, o, void 0, null, a);
  }
  /**
   * @internal
   */
  static _Parse(e, t, i, r) {
    return j.Parse(() => new zt(e.name, e.options, t, e.renderTargetSamplingMode, e._engine, e.reusable), e, i, r);
  }
}
Fe("BABYLON.PassPostProcess", zt);
Z._RescalePostProcessFactory = (l) => new zt("rescale", 1, null, 2, l, !1, 0);
function to(l, e, t, i, r, s, n, o) {
  const a = e.getEngine();
  return e.isReady = !1, r = r ?? e.samplingMode, i = i ?? e.type, s = s ?? e.format, n = n ?? e.width, o = o ?? e.height, i === -1 && (i = 0), new Promise((f) => {
    const c = new W("postprocess", l, null, null, 1, null, r, a, !1, void 0, i, void 0, null, !1, s);
    c.externalTextureSamplerBinding = !0;
    const d = a.createRenderTargetTexture({ width: n, height: o }, {
      generateDepthBuffer: !1,
      generateMipMaps: !1,
      generateStencilBuffer: !1,
      samplingMode: r,
      type: i,
      format: s
    });
    c.getEffect().executeWhenCompiled(() => {
      c.onApply = (E) => {
        E._bindTexture("textureSampler", e), E.setFloat2("scale", 1, 1);
      }, t.postProcessManager.directRender([c], d, !0), a.restoreDefaultFramebuffer(), a._releaseTexture(e), c && c.dispose(), d._swapAndDie(e), e.type = i, e.format = 5, e.isReady = !0, f(e);
    });
  });
}
class Ri {
  /**
   * Expand the RGBD Texture from RGBD to Half Float if possible.
   * @param texture the texture to expand.
   */
  static ExpandRGBDTexture(e) {
    const t = e._texture;
    if (!t || !e.isRGBD)
      return;
    const i = t.getEngine(), r = i.getCaps(), s = t.isReady;
    let n = !1;
    r.textureHalfFloatRender && r.textureHalfFloatLinearFiltering ? (n = !0, t.type = 2) : r.textureFloatRender && r.textureFloatLinearFiltering && (n = !0, t.type = 1), n && (t.isReady = !1, t._isRGBD = !1, t.invertY = !1);
    const o = () => {
      if (n) {
        const a = new W("rgbdDecode", "rgbdDecode", null, null, 1, null, 3, i, !1, void 0, t.type, void 0, null, !1);
        a.externalTextureSamplerBinding = !0;
        const f = i.createRenderTargetTexture(t.width, {
          generateDepthBuffer: !1,
          generateMipMaps: !1,
          generateStencilBuffer: !1,
          samplingMode: t.samplingMode,
          type: t.type,
          format: 5
        });
        a.getEffect().executeWhenCompiled(() => {
          a.onApply = (c) => {
            c._bindTexture("textureSampler", t), c.setFloat2("scale", 1, 1);
          }, e.getScene().postProcessManager.directRender([a], f, !0), i.restoreDefaultFramebuffer(), i._releaseTexture(t), a && a.dispose(), f._swapAndDie(t), t.isReady = !0;
        });
      }
    };
    s ? o() : e.onLoadObservable.addOnce(o);
  }
  /**
   * Encode the texture to RGBD if possible.
   * @param internalTexture the texture to encode
   * @param scene the scene hosting the texture
   * @param outputTextureType type of the texture in which the encoding is performed
   * @returns a promise with the internalTexture having its texture replaced by the result of the processing
   */
  static EncodeTextureToRGBD(e, t, i = 0) {
    return to("rgbdEncode", e, t, i, 1, 5);
  }
}
const io = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAgAElEQVR42u29yY5tWXIlZnbuiSaTbZFUkZRKrCKhElASQA0EoQABgn6hJvoXzfUP+gP9hWb6Bg00IgRoQJaKqUxmZmTEe8/v0uB2u7Fm2T7HIyIrnz88uPvt3f2a2WrMbOvf/u3PvvzP/sUf/N6//i8vf/lv/3v5H//d//Sb//Uq/5u8yf8hV/m/5Cp/L1f5hVzlG7nKJ7mKyJuIXN/hPwqXI/g++zq6rPI5u8z+WqfLre+zy7PrVv9L8brsMiGvk8XLmM/sdfHXal4e3ad6GXPdyu2ij8u/+uv/5cuf/OSLfdtEfvUr+dnf/d0X//t3H/7bf/hP//N/928h/0Yg/4VA/kogfyGQP5Wr/IFAvhbIlwK5CGQTPP+9z5uPeePJSW+yo2+s/GtN30Rnv1E+f5zxof9R/lSXv/nr//mrr3+i+5dfyX7ZZQP07Tffys//8R/l/9TtX7790T/7r/8G8pdy+/8XAvnnAvkzgfwzgfyxQP5AIL8vkJ8K5KsmMVzu1U7p5PA5AXxOAJ8TwPf7sX/51ZeXfcemqnp9w/W77/S7X/6T/vzf/7383RWCX3/z05/9i3/13/0PX//eX/2FyP8tIv+PiPy9iPy/IvIzEfm5iPxCRH4lIt/c/393//9BRD6KyKf7f488fP74/PH544dJAF9cLl98IZfLBZtuqterXr/7Dt9982v95S9+Lv+gF/3i7Spv/8lf/vnf/vGf/dF/JfKnIvLnIvLvReQ/NEngn0TklyLy6/v/34jIt00iGJOBlxAsdvv54/PH5493SQCXy9t2ueh2ueimKorrFbjq9eNH+fDtb+TXv/ol/vHyhX4Fxfbx7euPf/Lnf/PfiPyeiPyhiPxxkwB+fk8AvxzQgJcIrGTwFsiAEXH4/PH54/PHUgLY7whgu2C7bLqpQgHB2xvePn6SDx8+6G9+84384vKF/IPu8iVU9Y/+7C/+jWxffiHytYj8VER+X0T+oEEBvxqQwCMJeIngo5EI3goIwVMIPn98/vj8ESaAbbtu2ybbvl8u2ybbdtluSECA65u8ffqIDx8+6G++/VZ/efkV/sO261dQXP7wT/7kX8vl8qXIFyLylbySwe/dE0CLAr65B/9vGn0gQwRMMqgmhM/J4fPH548eAezbZd/lsm3YtssNAYiqiogAAkCvb5/k46cP8u2HD/rrb7+R/2/b9Wu9yJe//8d/9Ney6S5yEZFdRL68/38khG/uKOCnAwoYkcCoEXwkEgGDDq7CeQfyOTl8/vhd1QCum26ybZtu2yabbrKpQvXue1yvuF6v+vbpTT5+/CDffviAX1++1V9sO77WXb/66R/+4V/dgkbllQi+aBLBV/dE8LWRALwkYCWCNyMZXElkwLTMeMkga/P4/PH547ccAVwuctkvdxSw6bbdtYDbTfSZBN7e8PHTR/3u4wf55vKd/nL7DX6mu3791U9//5+/gkNFZGuSgZUQvnKowKgLWLTAQgRtEniTuEfwaELw0MJvf3LQzynud+53uG+X6y3gN9kul+2y6XVT1U27JCDAFVc8ksAn/e7jR/nN5YP+avtWfq6Xy9f7Vz/9w1dgRYngiyYhfNkkgzYBWHTg44AEMmqQUYQKOmDaiCIa8TmsfmzB+DnZDQjgcpGLbti2y3bZHjRAdRMVvb/dcYU8kcDbPQlsH/CrbddfbF98+RPZfvLFnAQeieCRDC5DMvju/vmD4JkEvjRQgKULeGggowdHkAHTYxihg89vu88I5UeGAPSOAFTlrgPopiqbKPSmCKreUoAAkCcSePukHz590m8vH+WbD9/JP335k6/+tA86KxFchv8jMvhiogE4JQm8XhfKqOAqx5qRPyeGzx8/cgSwbXcUoLJtim27C4Oi93+4v6VxQwKAvl2v+Hj9pB8+fZJvt4/yzfbF9lPdv/wJnsE2BogmyeCRED40tGFvksIXiSbgiYSRRpDNDZ6BDI6ghM+J4fPHeyKAO+zX7cb9t4tedMMNAQju5V+f1uAtBSiu1zsduMrHy5t8ePsk3376KN98sX/xE5FPAnm7/782o0DiUINXMkCXCB7/P94/e87AWUmARQWVvgMuKej9t1RLBp+Tw+ePgwngsutFFdu26WXbbl+rSvdfbnqAiuA23QcBgCugV1zl7e1NPm5v+LC96XfbJ/1W9y++fgXjA3bDYXV+MuhRwSPwL3JLMFYC+HS/LU8HYrGwIhwyNOF12SvgM4SgztdifP85MXz+KGsA2C6X7aJ6bXSAOwrY5OYIqGy3d5uq4P5GhABXuV6veLvRAf10fZMPb2/y3b7vX7+g+9v98/WOBq7GG7RNAlYy+Dgkhhb+Xxp0sE8IAC4SGAP/TbgVJK/PoJPBnAiwPKxsXfbbnRg+i3s/JAK4Q/4b9NfLtomBAqCickMBjy7BuywAUVyv8na94tMjCVzf9KNcLl/0SeA6oAEYb1i9g+FtSALb/bKL8/+t+wxXFMyswqiHoK4ToIgKqslgpg1qUC0QoYbvJZg/B/q5v4szHmPX7YEAsD0CX25OwEUVm9xag1+agKg+nxQArnKjAtDr9U0+Xd/k4/UqH7bL5YsewrcBBiMJZPRAp6TwQgWfjM9vgRbgUYGL8AvLWH2gqhesCokeUmCSwPsnhs8fP2YNYMO2XeSmAWxy2VQaXeDmDIhApf33rD4PTUCuV+DtCn27XuXT5ir8VmCJ2G5BpBM8/r/dEcJb8/0lEQMtJHA5TAlqNuLRhJChhEpSqFabH3di+G1AGj+W1/dyAR4IYJNNnuLf6+tWC9CHHiAtFhAIFLjK2/Uqn65X+SS67aK+3QeTDoy/IG2ogQ7fb/dAtz5vBgrYGqrwNtCHsVfgIvwK07OTQBURVNCBFpKCOjqCHn5L/67TgTN+fpySAC56nwSUi256kXsSuFGAVyLoUIDo8/Pz7fdoErr/v17lk162HbgHvFpIYDfoAJJfW4sGPjkU4VNAF8ZEcLmLhdc7kljdY1y1Dq9yLiI4IiRqcLujb138KIPn80ejATwRwIbtBvn1cqv+2J78/5EI5N4cJA8qIPcmwRsKAHDF9WYP6mV7VmrgLuTpxYTcMEW0LAmoQxFsuvAI8tv/a/C5fV2ZMMiKg++FCM7RDPRu8ebWY7VG6VJi+Bzk35MI2LsAckMAgwvQ0gC5DQjd3ABg2HQLAPpEAlZ1Bu7VV7MGHDFRAbo3VKsTbAY9sPWC/uvx86gBbDK3D1eEQS8pbAeSgSwmhepnJb6uBv/o/PzHLzxWA/X7TH77De5j6AGQi6o0CUGfCOD2X7cXAlCFQABtEsGLDtxuOyQB2UTQBKZe5GUPXgkUYCUAbZJRhBDeuq8xBf+bgwbehDm+BFQi2IJksOocvA8ysIMfxluVcRsY/eB3JzH8GFDAXQO48X/dcIf9jyDHptIigDsFkEe066tBSETQUYF7ElDdYEBytN4+rk9UcBPfrKaZqFHWcw3i4J8/X4ev2//bSXqAhwTay6OEIPLD2Ipt8OtAGzxkwLw9WVFRjTc/qC6H3+YK/b1oAA0KuOizHfieCLaHHiAb5NYTIC9EMEbZrVEQt1xwhVy1UfBh8PUOquMizwaap3tQXfY5B//tea/NZdfhsvbz+PURQTDSGWB87VX/7WSd4KxjUqrIgE0IUkoKGnhIvwvawpGf6eECXJ7tv4qbA7DJgwpsKthEmmYgfaAAffYF3HLxo0vwNjJ0SwRWMG4db4eh1gPNm18vQ+us/0eGmxDemu/fnM/X4evq/8342ksGHgLY5LyT/zg0wM8lcMjgGFXwqIOVFJBQw99eCvF9oZL9Mfl3QwAvIXDsBRC9R+fz8x0FPBLB0xJEpwUobrfAkARgIAF41h3wQgP6QAmX5E/7eI43IxGwwf/moIkRyWRJQIPgt9CA9b39nzt4bYUWjAlCjWDPgv8IEjgLJfzuaAsrv9VdVG4OwOXW/fdoA35qAdL0BDwvf6AAUVHd8LIEu94A3K+Q+2YxaB84MOH62P//qoo38fCRDERE2zf0JfmDa+MieElAjcDPKz+mRKCOtdgGtXaBjgNJ4H2owSpNeAW/rRH4CaHSpMwnBYYycjgSJwfie9CR6mPu20Uv8kABF206AvXlBMiIBPSlB9wjBW1fwEuSb94296VCqgMaGCt/G1BbExi3IG+r3a3J6P48Gv/J0YmEYoiGY7V/SxwFCwGoE/xa0AJ0CEiV9QPCJb1OJ5F1VTjEY2/MO9AEJvj1BJTQpqLfTlGwjABuzT962e4IoKnyrdh3+/6mzDVJ4PHOxj0JqGKoy20+wBMN6D1gLWi9NQHfVP5MEEPzjGYy8BMAOnTAJgEr8HUIejRo5xrA5xkR5AngmiSHs+zDDAmMgWzTg55GSJEmHE8IvWPAoYTfhWak/Wn/bQ0CGLSAjv83SUEfKp5q24LXuQICpzrjrgWoza8xVE00CQCORdhMJuTUT/rjuls0gO4Iby8BIEgK6gS7BsGuTtDrScH/fR68biUHNVGBnxjeNyHEvQe/ve3LZQqgG3rof6cEclsNflG9J4KtaQ8WHcVBHS1BtHE4QP9OBMS98mpbKTeDW7dJwRsnHpMBTFJpV4I+b0kY/NqInVFSyBLANbnMSgBM8F+Fqfxq/h657/Up+GaBnwV9hRqc9bZ/vA6vu+T9E8KPJWns94UfTeCj2QXwCHS9dNL8Xf3Ho/rfewSeFODGDV69AU0y6NFAE1DP3qK++rdB7/1HRxf86gT376zOr99T/h/ioBiXWQkgQgVeIrCC/WomhDmQK+hASI2ARQZKooHMLdCJwGEBBXC3+uERwg+VOHZ9ioAt9H80AI06wGgJ3nQA3BoCut6AhxYwgcPOFnxuFnrphk+NIKIGrWPQtgz3b0i7Y6D5rs1GKqTop0nQX52vmQC4BkjA+r4a7Kx9WLENGeegkhSETBCrNXIMdi/444Rw1n6E96ry7OPuj8UfLxtQ78NA2iSBbg7gIiIbdDLsb5agPhLC3RkYKv8NDbS2YGsatNRAG2oQwf9ZIOydgy1MAzBkAw8UwEEIDzSAqdPQ6za0PkeJAMH3Z0wXniUSZoHvBXU2mcjQgv56TedIKglCpIoQfgwCIjOytd8WgN0bfxoR8Fn9Gx0Aj5Zgq0lIZbsH/ibSJoFnS+C98g9ooHEELI3gliy25yONIiE6pb0NfBlyNEYyENoodkKwgl6I6s8kARgJ4ZoEfuYWHLEJa0LhSBXm7kImGeSfVdoJ1DO2G7WXsehAptupSOoyrCSF904k+6vt98X/ZcM98Hsd4JYIXhQAIg3/f9AAUYhsLQKAtkHVBnzjCKhOoYl2ym+iBtvzDzQ2DLXJ4PUmbJHAVnBQX4jkxfvHhNDqAdHXGQJgv0aSDGItgOseHIU+K9hXnIJzkoGlEKzNHagTdJ6VWEUH4iCKH4fd2AwDPaYBm4Wgng4gQ9V/CoGiuNmD04AQtNGMGzSAAQ2I2pzfogY9LRh7BrbOh4+D30sAencljFu2CUFrwY8UAWRfWwGvVOVfbx2uIILM0pwDv082dUTw8hYs8L+uIWiHGpWgClnAa1lMPJogovvvbePPs/q3Xr++kgCsfgB5oQF9WYKPJqEn6G+OE3i5AqouF59FQOmahQC8rlPLj38kg1c2f30vw+XaoIX24/pMGIgSBoZqoH3wo0sIIGlA9PWcCPrAtpPB8eBf6x1o6cHra+2+tpIFP4PgBfxZtZUJfo4qxELT948D9ucK8Mt9+ccjIQw6QJcEbrD/1g340ATuDgDkFfx6twSf1f9xvuBECYxq/7ythQQGm+5JDx6Brw4CkMGT3wgscCUoQ4sU2t6DR2ciBjTgtcpenQoZVX9NuL4Owc+dVaDursYVkVALX+shjSBKBuvCYDUZjE5BdNkxdHAUBexyHwB6NP7Iyw7sxUDViwge1t+mz8B/LAvVx/c3PeBBCToB8IUGOgqA3iV4yUg6UAOxaUFHDx6CYS8SorMOue0CCJGAf5YfRhoAI+A1CvwxqNkAY5yAIx2EQmkFfeWOXi+nEdSQQA0ZHMEItiagJArQxDXIrj8nCfQi4HZPAttrIahso9oPQ/2/JwV5JQU8zw+7I4D7/sBn4EO6rjw0FR+i3Z9fHtahzsFvJgM0X+tmVH5vaYiNDGAigewAz+gyNLThnjCURQFR1b9d3lZvnVqmj9mEPDKIUIC4KCCjBXywS4N+otp/Hk3QVthOkwEKlV9PQwXjT7s/zwF4Qf9toAAzFdjuaEB6S7D1//U5FIQu2MevO0rQQH8ZmoXE6B/IkgE60XCjVoq8gt2iCG0S8L5GdxkM1cGsfsCMArSCAnrr7dzAZxCEEpepvB8tqHJ/q+bmJGGts/AcAXFOMMeTwC7Pw0B6CtCtA2vWgonqBQJFSwH0JQK29OB2kvgj2HHXAoyeAIsCQO0kMNECAhFMqCBf8mElAkyBbX1tJQP2RJ/ha0gpAfS9l+/5n00CkrQpq0MZbOdAuxmMvHswog62jZj7BnYQe19b14kxNq2D/ehX/p68HEcF+x3yP7z/V/A/q/5DA3i5A/dzA5pdgbKp3v3/wQF4Bb70WkCTHGRAA6+KL0bFl6FJaFw0ImZwm6igSwbbwPn9RMBWf3sN2JgA/BVh/Rg0kQBgePf6HglAHLFQwqQQOwDjbdVxNZjR4iM6Qa3WxwvNxh0JFb3g/WzFQQS8b/ttKcDWoABtUMAd8j9hf0MB2uDXhzX4CHj03L9DBU3Qjz0C0l4mLSLQPicOOwZoVCB6P6dA7nDbGkVuxcNr8PU2JQO4wX5trEqmccZaHU4q8oCDFOpzAnOwqyMIMktNNNAHouDGxO37DgArQZzlmp/14W1QlqHTMaIIx7SCx0+5yza7AKJ3IXBrNAHVDcMZAU/BT/vgv/ULPOA+XiLggAREDF2g0ci6xNDRglegd7P7TWWH5oJfayliEg7bScQRBVgI4Ookg/F6rvpLWP29swREqA3CaG8/FpKqS8DTAV4TiBqIqtxfzaQRLys5I0XEFIFrPbZRQb+16Fgi2LvJv8EFUPW1gGfQv1T/F/d/HBnccP7rAwnIIyHI4ArgWeGbU4eHy6Tx/EeTZIb5bo/BsMBjmjBE08f/RB0PHYBd9eVRAGY7cHRwiBf8WeCPHY1bgBTa9xKTELzEkQX9CPtl0gJiqsAmCT7I8xbjivh3JGFI+D2nBcSJQJ8agDX+O9iBL7UfG4bzAkcaICrbtYHz1ycSmGmAjJfL3CMgT3tQpmrfB7gxSzC1DnvdhQMieG47u75+kTouKNkM8c/+vq/Q7ZYjO/hhVvRq8F/9gGfhP8aqE9EIdR6LTwJ1h0BItyDqB8iFwuNqASscRnYioxOg9ApvnYA35f8e9Ohbfe8J4rknoFkO0lmA2gmAG0YK0DkB4ieEjiLoMD8wBzom27ANZkzIoU8EMHk/uo1mzeVoEoRWKn8L/62EYAX/lsB7D/LXg74uAMr9oGivJ0CNJCGD6i9DhZdQF+gtOp4S+NODRzsDVbhdgv4BqTMNyIL9SCKwL9/FGPp5oQKxIf8A/UX6r231H7YIqLML0Ae2GtrADOvRQH5b/MPE9dt9BGLNG8jVTAQvIaK5TtvvvWQgDvyXIClUA78S9Nfg7VtIBlO7cbsEYkQDMot+ygQ7QwmOawTHnAM2XUSnJvPIYRYMmYPS+sv3J+cfP3d04JYIXsF/EwMbBKB9Q9AY+BiSwFj9mzrSXmcJhFPVHySTbgHJCPvRQ/z7G/SVUETsg0ZF+i3CRoCjhf7y1A9mOiDD7TwdwEoEXjLwAv+avLE2B7Jnb+OqDpBoAchoQJskxKnss0vu7Q2YhcDv4ySeLOg9GsCKiUIihP7yfW7zbTsBh0TQfN0iAWn9f72Z56/Ax9P7j5OAH/Qvv3/QxKfk0DgDuP+R3USg3bzBC7bO/QT9Eeh9QvDPG7glBQzJwK740lAFFgFk8P88CqDGAa223YckWYhr+c0BPdwetl2ocnsfzePAWcVnnAIp6gDVhDLyfV4nqFEDPxHsbWD3k4BDkN+pARqKMLYBPzYEvxp9xmCHQQdgWH/9EtH2TIFpu3AH/cdGydv1j0TQbRrq+D/mLcX3ZACZ15bF378CG0My6Kq/zoGOQwhASDFwFbxyNGBuSxbCEhQ/uEPe/6gAERWQObCVVfjPpQX+rexxYhYFxIkgpgX7Y/vPs+Pvxf9vwt8kAs7i32t3QCP+3SPaTwIytQXP38u0PESm+YER+o9B3vr8mETAUfDrEkPI80ck0FZ0dXh9U+HRbhey0cAc2H7A4y4egoD6y8JfkBiigLdFP8v2W00E8deT2IeAKujZ/QAVKpAtKI20gLWksHedfgPcb+0+NEHefd9vB9rayi8h7J91gBbaw20MsnWAF5xHkyDUCOoXp+yrOwwxcKj0aL6fFppaaKDv6OpHR5sgx5BAlK/+fYhuP1D196o8e7lFBaKqv5YIMnFQpd0FGVR35RJCnCDaABaXBtgbiSwtICMtalKC+1JQ6bx/PLcDPQL91QFodQNKpwOgF/9eqcBxBBqRcKAAVk+ArQOMx1RYGgB6naDhlK+uQQwJYx4meQbxtNnYQwMjt/d4f3M9ZE4UOld1LAh99fbfzOxiEkKFCkTJIUIMUeVnJ/9sDt8/e1NEJOi9oVHDGYhgnSLss9DX2IAqw1zALUncKcDr0FB5NP+0cBQNrEezDiyiADPkt9qGpwoPdL0AGPx/NOKeyf3b9WJNdfcFv6bKd2cLMJVfJ6Y3B6wB9WFUfWWEwKMfGiQL+3bz9XGQz2EHKhF41GCtZyDi/gUCsNhYoAr3UNJ58YidHKqnMb/6AB5J4N73/4L+t7mAkeeP3P+1LNSB/l0SkMEd8DcEuUlguEw6t2AU/PCE/q++Akw6QFf1u6SBrj1ZnnhG50AfkoGIdf7gJv1KcSfgzWWkQ9U33Z3tHXYASKJ9e/YhU90rvD+q9Ej69/wxYJVs506Eg/r3DkMDzEdDBRGgcZay49XihLA30P+l8N+hf1f57/0AoxbQbwYaan/rBMirE9Dk+sBzTkC8JNDEUlv5McB8PP19Y01Gayep+hC/2zvQ/2HGLAurowsNGlA1cnqGGzeH5weiYLZm7h3QQC4O2tXdhvMMk1ZS5ebpgI8eMrPvPGkwaxayk8Yc6PMOBPEdC1XZ+2UfbfOPtxLMQQAG9BcZFoF0gp/RKjxe7+oAw9T7ZPWhgedodgz0gf5KBtrtIZhQAZpAV1Bi36w6t98qVfH7hqGI318lLCjLCUFlxRHwqYEH9a2qb4XjWvDT7kBwfbZA5P0+PNuRuW1yf4yNQH3zzwv6b70QOJ0G9OT/dhoYRUGT15uQH/71MjQLtQlxfDuiCXrtM+SkA+icQdH6sU/xz7Ze7FlubV4TpoTQ2osdpaEjtqADmEU7OkBEFoLeC3IWFFeswJXKXzkboNL+wzcFHU8hTGKIboO7CLi1/P+5F+gydQhuvRbwEgxvtACmANikhLTbj0gCYk8KdlYgmj+4Ymaod7TwahwadICuX0Cm2fE5iNHPK0x/CDV66Kyg1MnqjNFBnhBoLQCgUULfaVe5nq/6EQWY67bXCszUb+7232fVPz51iGB12owK9peyP1T4raMFF/OEYJP792mgXYfZ04GHMAhBkCSmSj+dKqRPgVFGHbpLEGMiGFeQWfSgrY52VxaeDUPSNJI0P7NoisG729HHl78z6hxfs9rV3m4JjgM/lsui2qmThjCfDFSb+I9vwUqG5wwL55U7C+6ot8B+7N2o6r3q37T9trfpjgmTvv7PSQATLLeRAOZhIJHBQfDQQJPBdUwEbVW3+L08EcEE/9G4ANrCeWcnPKRHDupbNynMx5AA9IRYLmrc/YLSiD5EaEBS/s/TgnU9ILcH19n+CpHwegLejx7Mn/d25fdN+e9U/1vgb7bqf08MOtf8EXxaoh+GY8L6gDfhvs4i6HQ7seYI2sv1GchdMsBIG3xlvxcCRzdgCPTn+6q/TW00VE8Q9FaFv+R2VlOM1vm/hhjhDCdgNflVKME5B47I9xT8z0YgPAJ8myb/LqHy36j/Mwqw9AALxuO1JVjiuQAYLcFzIhiEPe05fk8tRjGw7yWQbsfuLAT2VqOId1osnr0F49VM8INACPHDoBz4B5mqqSnUgyh3ArjXxfQH5BbgUS8gP7aU+w0zHD9GGD0CGHf+P1p/DeivlhU4BbxR9a2kYFR58YaDZCUR2P0DMmgED2eg77puegy6PgDphEB0CwlG/i9d+/Hs34pBEQrBn0W51mqGnJAk3ACCHeiqkQ1XFQA5AlKH7Lk8yJKWY3/nym14h2C3JvxeMwD9ZVMz0BPMi1n1RbKl1cYhIVblF3G0ATsRiCMUvoK9//OgcwYMoe+ZKOLlC6/Xk50br9NFz9fanqA8UIYSpCwlBO4kHc4WLLBfBHVaKwKgLQjmP4Un61Vq+3s7Bsyi0WztmLjJwJwFeE0I2vD/1Q6MVwefxfUf32skCPbCnxQqf+QMPEUDHZ7vGeyj020JgkPXXwsldA7SYR1RE3h94NvNtugswcgxXEkIcBPCGZ1rmrgDC0A4K88nm2fn/eTnpQtWyZfybRoK8Dro4zYDIMGsf7saTBzvX0SMbkAD6o9CYbsfMK38cJKD9l2FJt9/VGs0h5Gib33pxMKWNsigFUh3G2un+/N1WUglI/EEx8fq27vUNnwsiOoKecL7kQS8VnWAGCFUgn6dBtQhv40CmIYggwK0uwDHRGAuBXVdfwzHUjZzATLMAoyJ4FmBhzaWBlrHld9CCWpPHRqofBqMReMGTJ78q9rDes1Tv7/0m0v0AFHXNR6P6g30SHivin7V1BOhh3iWPwvps/yE836L2XiwnUT8x2iHgfqhnwn667QHEE8oLQjEvtEW7GYBZDrDVkwNIO4G5GiBDf9fGoFM6n+vbEtzXwP6u9AduaWnGYSLAlVdl/AU+ikrSeEIKgwdaZ4AACAASURBVKj4/wtgHcHtdO2nWKcBkPfxcvnNQvsj2Me9f02r76T8q0IBn9OLKfz1HX8yVXQYGoAB/2UeBQ5/5kCL6+H/OGGoRnLSwdd3oH8r7KkGTbgIxEwVWvnF8KOpHnyzfF9Jod5Px+IF1h8owyitDw/XEgRb5bPqbt1uvn7qBIQ16vtS/u+DP3cR7CH0WWJgd5mTJKYgNzoGjQrfvu99NDBC+bnyW1x/qhTatv2OaMKgJWPvv5kwnMgxHYGFRtJW8VMl3uP+MgoqSZyWFKr7+KIDw1d6+IiOgZI4+d5iYL3imzbgyO+tph9t2oSBxOM3ugHtPoFZ1LM0hF4kXNEBssvVgPdjdXZWK7uKvyS3q1Xb1WQwtVDqSUggq+Vw3t56JA2cz7PXOwGNW1ecwxPhfe3QEUsDsFaAz8jg0nf+iZMAHNg/XSazDuC18Iq1HBRrOsAQ8NLB+16g614jmuSgs3bROxE55D+WDDQNA4ivdMJ9M1b309UqknaDU8ObV9/PwmMPATvTMAxpABLBzugUtV9bLdhNDQA+7B9tQJ06/7QNDHGSwtgZOCIA47InIoDdROQGtt0U1HI3GaoUnCnC/rzBMQJteN17+VaAzYNA7e+PFqHQUyXPUYB7iQYa5ZFjq1Zqpx8Uqu/XT7+6BWC1Xaj0GlBIwMoHu7UzcI/6/Acb8KIq+hzmGWmAYnADrIpvKP7TZeLaf0LAeQkGgebbq9FToI44p654F47tekKkI0L5PQNZPsDwPBpy/ni+wKMN76Vav4+2cFZFf8+JwAraMt0DFB7beA/u4Zz/a+RXx0M/ct4/jwaNAS8G17eSwmta0Fhx0VRxJkHMivso+onMXr+YwdWKbgioy1jp4x4AzIKg5lEA7wvHEYCRmdx11TAuT6lDLVl4KvXkAET9P4RT8H2u+lg9EPQIpw+/NpJ7RwE8HaDv/Mu4f3OdNkq/EfAiEiOANjEALvcWL9gfFV4NZbgbQc6qPky4Pm35QZxtH1f4j+P/jXuaYPcWwIEH/fmEPBoAO4m4LGxV3txOQqDU+dXgey+UwSzuqP++uImO/u/6ogCb7wTc1n61sL+vZi87rxnrNas+giTg6QLzaUCjIp6JfhwtGI7AjBBB9JjDY4ePYVR6ZPgN4owVv6Q2N5hhVHwNeYrM+w6dN6K1sMHZm/Ce7bHe3dzKr1xw1w4JrSQMZtgnoQHlr18fzunAszD4qurNUg/TDqzx/lfCaO6t4tACMUQ6P6htWjDPC1hCoZ8kpODzJ70MUR9AODcgwyqyPhmE+wfHYB/hvSqt6qeXUShhXH+d9SR8DzrDaZZdpSp/HxqLMQuATgDU/qDPRgOIeT8cvz/h/XC6BtE7ACLOWPE0KIS4UUjmZaJ2grBphiWgT41BUVWZfP3AnEIT6OrfoF122l2rMycBoU5i/OXoUZ4/aglsXwLzHNU++FVF3qikOj5HXm2PBitT1WuvJRAB+6O//W0/PY8vQH5IrAsMs/WuVmAdHBrQgrbOxJShXwRSsu08h8JMBpo0+aDTALwV4tbswgzHrftG/dJKIAQb5h9KCssWIMeto+GYqG12/HWGjx8kzqNJaa0noMWOr2KwW01AMwJoNvhMQda2/RKQP/3ecABM3g9uD6BY68Ntz9+nDOMb5iV+hIE+dP/Zs/wwJhJ9mgBnohBuStABUXjugF3hkXF9ZZJAjefKdHZCc389LoStKvIl7QIEb1d9RyciQgFDI9Cjyccc/23Aam7/PZJBhgDgin5CtQvbCzX8ip9YgIFtOAt+w0owp/hOiCWgEGbVHuYjRigPGR/YOnEoqPDoV5z5YqB3mRq2ox5ICmSSgAP1Ne+XV2NE+/vuFbCTRADxtS70VRBCjgBk2OyDUQiUgfl77b7DwaHm2rAZ7osRSOOUoHgKfNBSLI767+oDYrfwZvqChSpGfj3pFwZFsCJg2jeIQQBUiyI4WgD68ww4qO8khuWkkIuDrxWv2nv+UTBpJYiPd0KemTA8qqFiuUF1jWS3BoG6pADJq751JqBI0wvAVPyMQvjcX1zbELltKK+zBiXRFiRxG+b7q3M9xuLdzR8g0gCGNzSM5gNYfqGO9CBT8OHct6oB3KsSDBisUnwsFuISQaRHxDSv0vptt2oeLHMERfRn/FG/Cx01EpgIQG8LP+/i37PKw53xn6sYCM4/JwSRrCnIeB1ZkLsawDhaPKv/njU3wnZ/dBdGE8+YTHSG8+ofGgIjsC19YnwdM/KAnTSsqj6ig7uGgIPw3nYFzhhIIvriAxFP9CQd4HSlnzgxONIdrE7A8ZDPx9fjib8ifgegNIliRgdx95+E1T7+3nQVNNhEzDgGA3T2rEDLduwtPpuuouPcs8swwXFjdTaMKt+jA5gUAQPcf95KJQxYU0cYxEDvsBSmYuukp7AwnqniC9Afa5z8vboI68ImT0t26CvwBzSggkj447r9IojvCn7U92J/Hw0QSdwZKNNjxPCfSxRqnATkdwpOwh88oc4J8KTSm/wdbZjrc+4iFP8YO0/5JJDCfaijK5xVXevqfg6zGRrQf83chvX4aRfAE//6vv5+6490U4ADdO7QgM/5bcHP/n4OtCQhBEFeDWSvos8DPq8/IwzLzjpa8/U6MMSkBklDm8e0mn3QIY7XG1Om8wzN48y7HwhOK3P0/ZwUQHHv4psbdoVeb9VlAjChBCdtDDpOKTh9ZfcagOYq31RFjN4/gwBYzp8lAwYNwBELhZoxECeZxMlAzWGdCRV0fQWGHo8+8Kx+AAxnCIzowAxy9KvNepWfsfp4RR9kUrD88CPVTuXRybhqqTHcnxEGndsgub1Gdug8yz9fHt3Hpl57x/mfCOC29FOSQ7/noAZR5W3Ob24UMpuPYAYiQrQgk1gnFoUIKr4vKFpV15pHUJO3Y5rfH3UFHU4bGkU+NKJ9f2hJyOMxDBDpjAgwiYqvk5TqNl9EH2Arb6fA3yaA4cBtPWewhkEcIQJBlGzYp6zRmr1v+e3Fv27xpzvyI44NGDkCIi7CGNV9Dw0M8NtHC2vUwHINumCGNG8erxOwtQINsW88Tlwdoc+F85nI559ngEDpt2F/Uu3hiXYrkN/pBFS26hYDAkFgErMK67y9mGBA3L5ore5izf8b3n805MOq/t7XU4WHv1DUF/5gugCSOAIW/59uMwl6CHWAib8bvfxWl9/rBGEMTTwDfG+ezEYG4yk6FvRPuPwE+wvc39IRjENWM+/cm5b0W4Pf4WuKUnw/vD6eDbB1ETs5vl77Dhnm/51g6wPWwQAqxnivgQaeS3gy/u/1H4hpTPrIgHAN0mSgXUX13YP5PMIuQAfBr/f70cdeE+QoCX3i8nFMLcAjInBoAIYqt1LhC1WdtvmSab28AYffaeivCB+ohdYQgfUa/WS4ToMsNLHLc9nnvPZLwn1/EefPVf+U/xvnCVSEQEkEQEnEQJO7S7RvYDxNeNYKrG7DKMhtsQ8cMmhgPKKKj+F7CiHYFR5KIIPxOmg5IVAtu3ACQSPh7CzUQOgAej5CWEkIe3vgxz0ROGO//qYfz/dnLT+ZxDr4QW0eNCJBorCFOVC312Ec2TiY5Bk0cAaQmiA1VH1MOwDHQ0kHdEDDf+2UTWhS4Z8diQMicLx8MLBfverLcP/jQzF0P8EJj5+NGK9RCz755S6F/f1+X/gxeP+Wsedv+vF8/54aSPJYFjIQd624MDz/UDLQnr8HU3ztKHRf8Qeno1vyAQJBaLcMtTV3cvgP56COCqd/QP9xLgBkH4BxO13n4hNUDtACC6G1S3zqooZ6Ba4lp/zcAFb7iERKQwQcF39IFJjdXECGADw0IE4gg674pYAnk4HoHPx54tD5daO5vxrugSkMjgiiqc7TVKAT6AT8R4ckbHEQCYR/IZBxJgA+XZjsR7vaoRpIxWqeqfXuGC2CxwudicwePEB1kNkaZCuwyF0DuKv/4sz9mzP/Qxdg3BDkBTMC8Q+loD6UGBzx0Kz6eAX/KArOQTlPHFoI4vVtf4rNuLrca9edRn4xBP7k8w+9AgZCgBfEUZWfEs8iFNZ3UO7TqmkjCO/rWdgco/yIqHcQWaC2EGTzgz5y/iXQAvyx3riyxxV/JeBriaGB9OrTA5g9/eokM+37GszqfA/UZk9iW5UnCtBqBl3XoNN6Ag/+zy6A5evPAp+TIFDn15gQw9rjrOzFX0s2JBVAxa/nP1a6AsNWYGjPNGPLTQgBsNUFvOA3Ht9o/rGDN0tWOCcxJGp+f7++kkP7PxcGv1+GjkaLt/fawpwwerQxBJNW4b+PJsYEgiAYYdEAGIlDNaAbRkIgK3ut0jKByp+8yz23X6GttmBmjwDvChgiYLP5V/zhH6/110sGcKo5CkggCngxnIPoPja0j2B+1BRkiYJiviaLJqghDI63G2nAgAxMCuDdnoD0wIQm+urMB3VuAwbBrFGgGgnhAFqg9+ujKsLxB3qGCQNEEtPinIQlAj4WgIw7/iXc9V/x/yUWFs2KH504bAh4aYWf4TrTLGTy9YbftyLeVOWNfYNyt/ji29mQnqMAltU3ioTtbX343yv/1u0YPUBz6zB702tQucnX0gWaFh6DgPdmhXaapGotw0SFz1qDiTMdd8h45HfcqCPRUhA3+NmKz1l9teCPaMd4urGaewRitNBDdahR5c3AfQmDCFT9vmtQEwqAYXX4XI2n23Z9B/Yb1FL+LWox6wHGbZSo6FR1LzyG+3hriSZvWT6jfXhl2cmQZJDrAbuYAqAHo1GA/EOgD8eGcU7A8eDvH4fQBuAhBL/Zp/vamPTrRENDGLTV/7E1WEPLDlP/PwzU4YhusIMUgfIPAr6Dhv5R4y2r8ldFwiFoYHnmr8TAHbhRQSZOctH598ZYhqt6wP7q/ouqe77RJxvzFYaji/z4vna4v5cUMDXqDAJ5ytktqtBDckyjvJg04hl16LB0xFfyMfD77PZjErGQRRjYIfSvoAXntks0ok8MsUC4KARWnYPlJBeIgLeFrUgDOHYCag0/XNAbWgRwQuLAsaQwIhC1g7+jCNKuT38JfnYSyTi+QQEwwHeT4/dWHYxJPxfOj5oAnRQqgU3YgGZSOaDyK3n/qkDYBKptzR3oD6B4fyRKjp2AzSl80YR/3P+/1vBjX18Jbu+YsrMRgbqPP8zrDLTAaupphfeZtyPs9BPztpLSBZjowF3woYRwBwOWaqbev15b7X4RWsiqYiY6ZkFEIoUwUA2OrkeEQE8HYNyD/rl3m88jCGgO/nPW3xy8x4Q/HBcM1dYg5q8N+B/SBSYhtD0EY1PRGLDoKIBHF3yLz4H/gSYQJRETgqeB2d4vC8L2NVnQn4PoVJJAcP0inahAfdXVI8CFszjRagCTtRdV7Sr895NBpRKXIT64RMFw/iw5eChhEvmmyUIH+k+Qu3cLzOAN6ILlFvgWnx3YWFDz0f38ze9GlfP6UQ3ojEY0gtqRIEbA5/WgQFhsEuIeL75uTzvqHktAWfj/OD6sQXssROcGiRgFn0QVkld7OznMDT7CJKzhMIqxW9B+LCOQdH4uyxIcE49VTSeLj0wKjzcp2oDXQA8YoDEGBLMW0BJw+eAxXejPV/IXd59/tp5rVyYXDw5BlRetSpQAcvgfOwVM8ObzBq/AQ2wX4lwkQV3vNhYFfn2LFgaoDU1ogqsfqGkJYmrj9Tr22KQwBLzbLuzDeA9yzyJjVRfwegWq0H+FThDPA6ZhZwX2M2Kh4waovCzAWJTzD/qY00c+6PM8coz08VNqglzx54LfHuTJK7z2rwX35ABLg1DzsZ7Qv7l/f2yXDlbf4C/irg0MJ0aCuD0wP74MrxfdFlX7tq+vtRdCpvt599EG9Yz3V+P+Oj/n4zLruZHcJ7oMt/MNp9eD6HEeFb6/TMfbWo85Pb79HJo8t3371/PuIAZqMvjPC34nVV6ZB4hEuA7AzA5cfU0y2n6ux89D/35/n2/vWY5Bf0qwf3tPLISO1Tap9qzFB6eap/beqI94NCCbGwgqOItY3CGl446CaQ8i2Q9g0AvmgJOnBoAA0gu17tsKtKS7D4udgCYERy2QIceCX/P7mBW+g/7D9S6Mn50CS0eAoQPDcBjopIA5+EcxEjLweRjXq0UbLIjcBxsGx2IZvlf0ATjz/6qypAmY7bhrk4ahsIis6ccXKHdueAfUgk+RWPCLh42c6zEeKyJpRTdRAOqBbl/Wq/uT+q+Fx3FoTIuCzc6+hN8j4veGjuAnhSE5gKnco3A3XwYlq2sq+lmP4yEOpqEoG0M+mGDYuYT0pKCFHgLHKt3T7T9p8GcWH+n1UwGa8X6kQt2x4CeqPexegT6o/Z4Cr313PHdgrsS2ZReLfpKIf+IMFnmVmwxQ9AhithYT73+p2s+JIVfrjwiHnpAZrSsr9CMstQXP1+1+510N/q8E/YoekMN9OMFvi5LvkRDsy9rgFCOoPdpgaQIWBZjf5KCSQszZJ1ivTvLokpen6tsJAVND0NFqb6GUGg2Im4Dyx9Pn7/0dm4pADAslJzTv+dKNrAPQ0wyySm7bj1RQgbAXsRa4R+mBJzpaQmHLmy0BLoL+Nh2ZRca8uUc6P37k97n451fvTieAE8BdZ2ItqFEK6oOJIYPsiU4woo140Oh+H/UC++gatHYcOFT+2y3AYvD1rM/fpxdUcsAi70c0OxAEP45X/hymE9XeoC0zfYhbcqfbhs09HpwnKMDR6g0mmYyKth/UcLl9ITGQ8N1S6s+gA1HvQCc2pluPvN2Br8SyZyfyxPP/VhCi1L1HWX2CQCuAE8TIq/sBYdANZmTIwqq0sb0HIzhhugBeUpBZLFyA8y+EErsBUYDZHYN9QAAooQwOws+uQlhdESSSqk5Qsh8LSYI6LDS1AbmOvLlRBqQIeITvM36+TP63VfE5hFClCTr9zEyVFwS3STQBy66DMHB+PJWIrfgGnYBx2dTboPa2X49GaBVlePA7CFx4iaGi4ns0aLVjMGvtPTDtmO4XEE8E5Kb/8qYai+NHl60LgAICcUCoJPVeiYG6Pxw/X9VFNVbFn9FNPzXoIRDTyzcpREYB5Fm1EQQn3KRi9wKApR8Tz48SwxnV3qM0q7ZhpdKvr0zfY+gO4oQf+EGPFYW/Xf5hwWsUgxiBbShGoGIx+D2eH1h2EeR3UQMH4zMaUKr4033nzkSkfQADelFbLOQCalxdxvN8mInhPas9bxtGJw29Fx3Y8429MAS0fL33Oeo7qFZeiToCC3B/VSNYuU0fgDnkhxGgMFdxiYEY7MYel+OHPH30IMeVFK1C79l+QdXVpFqHlMAXEf3EYDyfkkGdNvJ8f3RAXU0jpgM7jMNA5yCrtfzOicKG/M9bgEkEjqqPPDEcDfqVwGZv6zcO9avDfOhf4OmLFd9OLBHHdxp51HvOBlnAoQksYjASA1xnIhPsapTCPjbsGB2YevpPpgM73EYeSYIftgPgte6CWesVBB9QEgfnWYMgoeC8ql69bWoRIqYHvSIv/u26bj/jdqZ9KSGk74JRo6QS9PuTiSHm6Z62kLUGH0UO4rwWrhtRETkR4iKRdI8giJ2D2nUCMjsA0TXiVDb98NAf/rCMlajA9wesWHZrAe1dlwRyVI2jx4KkyUHSx7YDe6YD4tOC6XW01puEdAJwaEJzf1uATHi6ZlSCpBQscsh6C1xRcWEG4bCFeKcAVhVlDu54JQIkTT21hptIT/Afk0kMcS9BKfjBJozcDXCrtgbWXxbMAw3INQIxtQJPAGwXmYaBbYh4SCsuKwLOAQ5awKskCMmRg8P3xwlBfbosQaDqyZqBkyQe1CLQACoTgN4qbyHsPwkTiF2pYaj6MAXBmUosQHnUEYCsBL3MW39SNKMJ5PfoBsT33DVJCEbFnBCMOkHfvj6Xq8uw+dgRIhGgAiUqf5QgKDFyhe8nnYrlqn9sG1GoAfirubygX4H+8IM1CmQrMFAJ5ExzKIp54nPoVU2Auh6eBShDlTV4u5c4HE/fVvjFrsII0Ik6QX+Iq68jB19ziLoKC27FYe0gC+j1RSS+BgB7AvAM3m8HLdy5fV60C8RMVuhD1ieQB32MCCq0QPJuvuw5IHF/geMKwOPdpmsxBwVEfGEOgeincJqNmuSFIPhPq/xM81CWIIi+gCFBqDX3QPYd2OcCRo6GZBoA3AM+00aesAOQ7/2Pe/vBCXoguD4OBD1WfPwClzcui12AuH+gC0gEwW72KfjBCQRBr05D0IQc7N8PzOCMehPWK384MPVDJQim7yDdoiRTItzzFV/ZOX9sYFetP0fsQzb6O7wOoFjxk89YoQXv+BmSN+yYHYO+BsDRAXHhuJXsEFbdIEGZQWUkNVNzGA9NZUVBIQL7jASR0AclE4Pb7JN3BO72mG92+o8UG3nybj+mASh0FsLKn9GPxDrEcS2Au35BzHO1BksriIJdpqWjKR1wlpR4fN977rZqI+XbYjYDgVDpcYQalOYKMiuQbB3G6Pu/HlMbi9a0EMkksXtjvvXTfgMKAEZRN/i/O7yD8Da2S2Bdh3ICWfp8yuMkYl5a4df4vVWt4UF0yyqEnaT6swYyWB8/j111Y1ERS9oB0SLMtBGDEBD1PEHwtdjUEAHnqmoHU4wCDAoAS+lHwtu9eQLUAgmxVvAuMB9cELMV3m8EUtcBYYI9nkNIEEJYrQeUHfnzzRyC39j8CgSkir/E0P2odnAmAqDnDIhqrtV9BDNS2POjv/0pwKr6z1h/PMz3uf9ykFYq9TtoAXSwpz0HljdvBCVAPY6t7osv6gFhMpkX13rcfXQMIpuTsfTibkfOPRAC2meLRipI4mDPwMD5x+v3+Ey+qEfACwoUEkKQSMZxYJDz9R68PyP43yvo2aYf881rNQbZgRU/jp80QnW/hdXqJxMvCFxXQSNHpE8QiF4XI+wFfQcw7VL2Md7RRajsKgh2D+6SLAKPF356+/7yXYBTUgFy/38StUjFHweD+iiHh8/LV/i/TSvGk4L5x7F6AsIKbgb4C0YjgdGRIToGUx7cgS3JKP8pRcgak95BJGQbjaJdBYQ1qHYnYHL8F45QgHx2gLMQ2cDxBD/4SeR0LSDi5XzPQNjM4ySE/HGG6g+ugltLNSARn281BPtNO72eJLjdX4ITSEgpQvJYFEUg24f1qAYQNQdxx6Q/RcB85j9f+03zf2QV33IDPHegNgPABTfqFR8cZK9TA7/ll0EQbUUHW8Gr1d+MSadia+LRHwhunv87yWoJ3h/pRDwJAbDNQQFd2P2mH4kP/wDT/ZeN3CK3+ZjvgVpw4r20AMafb58j4N1UMknuj6iCx883PU9g2VHVH5JX2eEcPghSgRBCKPzK0Q3fknwPN0Hk0CyC0zBkz//7duEetgFjVtypASDI4CsknYJgYDhqsBxxy29+eyxrAZX75EEf8f+CkOcijMDDHx4ASYGGu8WHgPwpHJc0qOG8FgFTuVk0cRZVePFwHEIUEu8xSHoL5qWg4I7/HgOKXe2dcnu2SSdCGIDTA+AcxY1zYL6Q6AAFu+/1GvjKPSeEoJV3NiM4Dz9C6oWkEav+NWjPWXNOIkKgNTi2I8LeBgaZHJxqrC4oNXoB9pzzMws/OW3ghSyQJgjbygOVEDhoj4nHLld8HPD6UUMFVLIgKrTL7cFoBRLQgEdXIseZ2/HhFPKbk4d5tYWwwR0nIFQSD2P5gQhs6meVfB+Bkyz2fOIvX/zxqsSODuAGIOLtPNnmIPCrv6Kqvgz3q4tCwNl9lWYfnsdHj2HTgQw5IBHwULmfSu1jEV3gDFSxTBmqSEVqiYK2IkWcRiAkwV/cyW9YhqHXDw9dkNQAcO6HFNJT7oChfrPUYc3KY17zAd+evAwF2w5SCKLV4EuCEKsKfjBVWHu9Q9Arh4CoBqEMWYBsNX7YgKP/69uC3M7/mOOz232QT+ox4iCyJGEFP4oBHd+GVvXBwX35nqp7qeIbV6L6tdZub3ueJ+gBIKgC6S5gOQFxDoGr+Bv2nzqbknd7ph/EmXzO0o+kZdc/wqvQkAOUffVMzKtYgx5Vob1/+HAfCdzHSiXHenX35/2JTr3KZ9Ruj2lYiMhLIFoNyMq9hFroeYMTE0bSLbhb4l3YlFPa6hMd2jk8dmrDgdQCnC4/+ANFlYTB6ATlx2GDGXP1rvL+SnWHw+cJes5/rRWt4H2pw9GklD4uSMpwasIQiaYR92gIyFX5S8dtRZt/nCAH48VXW3hRE/HKOsGquj8EM85Q9cfeAV4XwNGAlmIFIwPYrfLKuxV476RRetzcdeAsRSZhiHizCKEIOHn3EMOWy5X4uIJnXX6sFiBFLaBm/THOQAkVJK9j6TKwiSDTBWpwHkSPQJX7U959uAkoaTUuug6oQCBz1Zlxm0OJSIoIw04M+7zCGuYiznCfHww9AN6Ir+HXA7lfn2oBSJ2FOOh8SzINfmcAyITq8JX/sOMPx6A9LeYtVfwgCBZhdu25OB9/XmWWNPUEPD5dUuJ68wd1AqD2+w1PI9KxE9BW5t3z/igdYGWiL7L+wPv9jgVY8f0ZcbCKCuLAHN+c5wa69Zpr0J9t2KnpAGzyiAIPiFalJ8/xXrrA6Y+/8NoDnWCPNwFJzf5DpVkHte8hx76P+HU1+HEytEeSEIzAsu5r6wPJGu6oLz8VrKofXLce+ywIHhNa/Dmw8LrptWXZ4NKZm4pr/QQ7Qk8ehMrPtAF7PQCD309QgRgRZMKgAbFREAfBBXNalbHA9cEHMo4IgIUuPjjBWEUFEQpYTkhVO43eRiynJw9Jjj8TOUIlJExK+0wA4gWgQvcFBHAc7P4/u78/Ff4CC5ATB3P3oUwFClYgcALcxzp/B9Ez4DUV8RjBbsCBrMH4dLNwIDaCGhA6o3pXksdBvYBsktrXDgNJKAFy1Z+ZGIy5NXgXoBT8a3ZgVSPIUAMV6DjLxhsV8wX4n4ibbONObHNyCr8Z4FinNFjg8ziiF5zSV8A99u7Zdf5OisvVaAAAG3VJREFU/kIPAJLWX3hUIFD6o7MD4WkHIMXBk4IftSrPNBJVk0OoC7ice8HGS8XBKDoz/YFBLaQi392lGpCMJfhD9xVkx5Xbj73P9V4m1j0v73x9FjDDPlYvATkgFAVWcdNvJBamliOjAwRV0EpeRymAe717kMYRyy/j5FwFBX0fP7Dyx8gq8wn2ZXi8GfGYR+lFcGJSxa3Y84WgzBHetlU4cvKY44Ps4iP9fsgsPGEhQTAcHqwwGCj61SoPexKwasXFqtxq8qhD9SixoBBYcJEDNzmIoi3J7QkoJActVHocTVpPBCDhElAvMDK1PT/Sq3DwB/ygmyB9GNhYDH4so4Foy48kkPtZfZEv1PQTxYpyX0EI3Bu+/5krcN8fgwVdwWu2JNVNWAk+PcOOPMNdGFyAZ5Aj6gicgzNfwuHZg0HrLxBWfjSRl88fVCo/apX/IBrIvf65ZxtEoK9Bec4KZIPLe76osQns46NwW0pUPCPAyMc4A/KXOwZzFLGbAqD5xhhbgBcWfoJBAlarcCSQgdQJ+Movnih4gjZQTw51rz588y/ZgxVUEAQ8soCfX8OR26JwujCLGFAMsOjnwGrlPuQw9D/PPv8BYVR7pG/eeFtQpsLzR2KFI8SwKj9KlX++HeLOPuSBKrKeHBi7L4b+Kx184+ptAp4Trcscv69oARVYzWgaK01H1X0K3zNSmARKtxXYHvwJuT+8gLGGWgpHcWOmBeljFB2Ckg6wiAYOqfxEK3GMCAj6kIiTWdCBCXhkjUKMgJcLk271N9uLSbtvvK0S69OXAvoA5z94VsFubbmZvx4QAnXgBnJxENyQjy38wef81uPhxMpPJIQzr5ckuUTKe0wZyN57iFTWga8GvCwlh5UqvYgmaNV9XSxEVWs40kkosFwA70RgNOu8mLZfR6wDiwRa35y7j08NksqPQhcfkRBK/J8R75Iz+9C8gJpqzwiIeZII3QnYOkJWbVEI5jNuA+o2BwK82ifwnpSgHwaC+GNAdmW2VXfC+vPu6wR6lBj84C9WfvivZyUhZMJlJhjSukDlFJ3g4AvGJfC1iEpQJ/CaEd7G9wds7p71+odruKrHip/C7RdsxeVjzIxhoNkFGOW/+sk/YVAGtltfzZAIfzix8gcHhZCXpcGN2u69qWqD9OlRFAy7x2fQBhHUiETB+DocqvArYt98f+AEAXApsEmEcNLC0t2uPHCqPQIXwHYDfI4/9+8LMpchqr5HK39MJSrBXwnutNqjovjHFdq+fcHLp7YLR4mGgduW5hFpAXUoL4cTTuW5HJSkB5PC0S7A+8c+837DyoM1J9iv/po/o3BunlDqPjOSO/YbLFd+FGy9sxKFeT8b+nLNPrkAyD53FtT27yUS32yqUaEGTMBiASGcZ0FmK8nWxbvjC1q6WQC4VdWdAcBY8eFoAzIrC0b7Wt8wlPcIdE1FhUWeKU1Igv8Q/0dl4k/NnYSxdlDon8diUDeuQB4c8XVzcahRgyyZmNC+LAgeCfSVALde8/t1DCYawNoePGT83wlOpFUdOZKwxn89OsMEf0X8CxJCBN/dwKbFwkSMgx0ACJJDJD4iC1JEYh6XcEqVHpx4+J4I4UiAl26r5x64sttvSlAn3LBuQCz6edU8C+J5epBrC4YP52EFDgHrCw1B0eU9bOaTgh3wmYvQV3Oqqcf53XnVNXUBELX1xtSgFrirlII5d3HFulxBCNEfZx0h7K2f34XwdHpuYQcguN189Ow/nPXclaUcqMH5leCXjKOjbv3F0a7i2ZaRHmBe5zwnhA9S736ZC8AH8LHkg/T5znYgmES1dtuzGo92qwHIquiWX+4KgVLd8utv9Ml1BQNhEJW/FOgweiTguCUoQHkEwYhjfQIgm8eAzPKzHqAG5xGiiPyxeGRRaYetUpDVpHVC1T9bHGyaknb/TQTnuG7rDYwYCUT7/cMjtILzA+Go/FPw581F/mWeTkDuBsBCAK8ki+A29nMzPn4Rzjv6QV7xWW4fzQFUxb9jQQ1qc28kMi4mDl1NBr4usIsz5ltZqNm7AeJXfuTHd7nioLEyPBISU+8/tP1AC4Il/n+YGmjg2NiBRdl6yCw//zG5ph7bqaBuz8B4VMU/TqSsNPbwCeZA1cdxyG9SgKzRZPL+GXFOiH1/SFZ9wX8M3zUgvH8a4rMBjZj/h1W9MrwTiN6MlsCKiI4gycBzgV/xUaQGjGDHwHiYi0VIzeEAasCpNuL76AC7BIEl7i4AIxnAfoMxk35eJbZ68wWEUChs8IPz/EEE9BkUoNA4RCWSLJkY1h0Y/dG9bVCtUVPe7QRhtStXG4nOECDfUxc4Uw/Ik8JkA9o9+a83IrfHH11EdFUWc4phNgVFWkPsIHBnCvCCYBSgqEN9qtoXuwHhByYoJJA7BxIkkRwpDGgAHo+vQ3ZGOwCFJCJKUAx4MBpFZWvReeLgtBBkDDQu2OJxXa7SE/P4ZiUPHABjY1DsFIhPAaygWewiXK72hHjow/k8gCL6gKES8qcDZ7A+EhYlWCPGCX1wXIwzkQEKt8cP6iqkC0FEhFj/ZYtvXCtwuBLcDT5wXN+9H6ZEIkTwV/x/s78fXFX3siWHEKrC3tw7EFZ31Ll7ttknQyEMGgAqCaVe1bGk8r8nFWCQQR0h7CY0dsU/mIeIuA1AGCo02Q0YVXxub36sG1Qgfo0CBBUXxap+ECFEycQVyViBEBFPt14TK9rZHB9EwMG7DPXOv0OVHkdtx7OSCXfb3av4CFZGTwQBwT7/hKPHE4PzpJ4L4+FM9r1n8B+B+9R9I4Fu9brYUZgCunZWNxdQgIs8mASBQ4F8hJpEiaf4GPihk8FdAxin/kybjZjTj+mAQy6ihZ9whDvHAWB6BKrBXQr+5SBfqPaINwiz12UIwoTmbPACZY/fshBBBKNlW8ZCHwH/cVKSOZMm4Mxk4OwE9JeB+EFkn1IzcPQoiSB4vGgNeJSoik1A7m0TCmE/HrggB+/1M12C1Z18ACGoIeH1pH2IhAqFWgBq+kDFEWAvA3X8tpW0cnSD5WAOriOHhnYraF1eLTkS8P/QsHUBdtMPnOrMaANJE9AZiaKWII5Ue/8PTHn/UcCSTgIF2xN4zdmAQYIAKeBFl6FiO0aKfq5jcImHfPwTxcEdRmD3LcFoAva1Hdjm9UgGggI9YOoPkOBYLsT8HlG3nucMDGkOOJ8CkNOELdSO7D5qqAeJYBb2GpABgRi2gxLITgrOQ9C937HgB+0i7MeRx3gfPWCXLtgbLJAu/gCFBPzRX8eADJqCvA3FViC/BlOQC4LZyrBq8BdQAOUKoKjqR7v7EFfVFMojPgEoSlJesNIePyLHwW9NRgq7E6HvUN8A0yj0wyWDHRZ3J2A1jHdMyu3hCGwSDwdRir7h9VP7AKLgPoMCgKziOFLtrUm8aIFHlgxYfz8WBYUU55iAXauo+evJaIK/NTgRJM9sUcZRzcCnMdNKMJc7usnAyrpxHYkTRHK+n1HxS01LheAHqRWwKIDqLvQC0+PupHZgBawfVGsiniTVHwZHRqbUI/D4Cd+ftgyLAR1ehkIiqaKFw7MJEwUIuK5zsu4svoFYCFKgBJZACBuppOId2RDkPZas8H9kULcA9a0KTCQDGtpnzT+RMJiOGseHl4BQ1C29AWUXIIf/OIwwqoNEK3SCuA7FRiBrE9B4/PcrGJ1OQNj83F4Xbol/TgVHfMiIZLAdcaVkgh8sLrd+liNQH/FqsNTfj15m1J0X+ffZuq/gTY7QnvIfJz6UzBJLs83ItQpt3RfZz5iuGfNPajpngUm0R8DoA5jDlzsOTAwZjzsC3Jjxg7H914PjlcskGdghgx9HG4OOQH34uwQyzz61/0qiYNQjXxECuWYbGM/DrjtPH/Mw/K+gBLLSA+cEfPr4MroArzcDuybbr8Zc72i2UnzeHnTgzD4Ug78SzIvCoARVOQxaFFR3TzWnkkHUVFShEuqKxZnKz4p4YYcf8ZhYhuu8wFgSHcuuwCJagI4bgchJQK/qe9c/RT6nGcg6KGREJpb+MI0EY/b0jcsni3AJBeCQNsBOFVYoApcM2Aom4VFgIRdHpeIG8D3YaxBD+qCiQ+rBOSVnci8hzkAG1t/pgHA4uwDzmu8xFKkkkIqCfkIRs204r/hiDgutoAAcowBMZ9+KS0CcXVBOHCvJw2jMQSJyeoeExF2DuTuRcuWAo9sefyUQ6/oBaIjPtiRH1KvQKvygAHb171d+vc4GRMDPoxN/kL5pwlVh1mBQ1quQJAJ5j0TgOAis+h8d3mnC8xTKE34+8sDNjyVXE6nFMN+H39TQDmocHScENvN74LoGScGU4f7g6IG3n3C3qnG6JBS+Z5tHOOzRYQx+u7MZmAl0OSsRLAS/VIKfRAWU92+12aaVPksGDBWQuCMvgNy2M2Mt8EwqbjosZAec5xLEAmXmcFTHiOWARWglpNpjdEtBQRxJJU5VL5/7F1X86XntXgUK4q+KggsUoIIK8oA+kgy4+zLaACqQGTVOX6MBWdehL6BxHn+tlyBMDGAqufd7WOX5WTJwKYDfXJJP2GXDPk7Tj5Ed7BOG7DMFaBRAJgI/+H2Ngeb2SKb0zkoGlQBHkefDr7xMA5HZeJPtKIzyApI9gmnPgf1c3mulfhe0gFekDCdNFnrOwi4Gs6eTACNjB+Uegcgojog4V25P8bctRYY6RL8AJklE9ACFAGZdBEahd4d4CmghFhbzcwaXYH5qTlS6DY+KfNH5Avzjo2JJ0poDkSCMxLn73H/eB+ifvgvyIFCWAji7BWC8hd0qj0FziMdrS70BlVbgamIgcmotGZDNPwm0L9l5iHv7WRoAFx57ScFS2r2iwot8oKu8l+TOCOg2mZ2nFdjTgOFQENzKkJ8OjEnsE8f6AzyXwT6MNF3RDRnuj0Lwo6wTlBMDIyqaz6G+RiLJMg/KUrQV/rh9uH0tWduwoxmky0kSMQ+rnXxZsGadgnxfgk1pCnsIsGYltvfdzTOBIclIsN8MLAGcz5gBwj94AE8DuC9Molip/JGwB57nRyJiyD3pyk6q5ij+3TzRLohcqyqCEQBTepF15+WVmW8SEr5jMUUkx3oMIsrH3ndwAQganKzyMpOJNxMQooGBYwcByw7axIhgPRGEr6GSGJhkAELoQ1YRg+dPeD5IIRDIqq5PA2Jh0Rq0YcS8XBi0ghGRFpCtWTdum5+yLOsQf2EuYY8AfnbQZDgCjHxBSKwTGpt8QCIDVH3/4H5OwEvldhliINwAFLsEyyIfGKV+vm3eEehVqKTdNxtDiPoLHCRiuwTJxCECxMDqDjTvZ63KaPKvRgV2i/F3ohm88V8LN8hgJcXD5pVGIPPNn9EBqSQC0I4AMxBUcQNCkarkFgSn/oCs9GCVep4eUG5BRAOcQOCWlGSc3If0IFqRfURQGRrKewPKEJ9sLnIowKCcw+f48N6UHjqYtgInaCCkBbPSj8VEkCr2g8U43wY1xX/BNkwreQrzg+oaJghOCGTU8RBxuIp6VFOGoEXgEsBLIgV6gBgxoLSI5CgiYNT+GBHsU01GthrceiMUtv9KgAYktgVNeGrBbtiOQVi9x8WjiAW7UNUnm4Vet7WtsFgDCDYEwQ/EVL1PnQf/xCDLTowTh4c4HPRDoQaiwhKIAae4B7xgCBydI/CDPOrevK0FR4p6w3VfoXgQiB3T1N8Y1PCD0X19JqcHGfzB5WkQE4p/kdeXBcEVUXEIFqSij82lMyrWq/7c+LFHA7z5/dwOHHg8s/Y8C2CmhbmALtare+4UWLfb25BmXABKABTniC8gRAP2yvDAiUAsElnrxFzITQa/sAFecAOY7zPV/8jMQHSbWAiUPGkQNABhw85xrSCv+mMSzFR8+7mjw01A8f4F8S/td4jnDHYxpT8/OEyV3gz2+GTfdAeAszswfJNGlQhEIjB0Bls0BKn4Iw7WKu9f1gmSagmvqleEwJwnZwjO7npz1HdCJ1hS/mlBcRXyF3i/M7NxqJFoeH27z7nnJaBmpUZKHsTbGUc1ALEoIGsGYl9ixS50gjAT/VhB8IzvGTrBVfWEz1MzAkRFTtecW731VdjNQPukVdhdn0Y8d/a7WYH6i/TBPBzUFwAlHwtGHOQISrgb1AMUgDETTA3+THAdeRJhg59V/Ektofa9I8wxVICkC7QQSAd2O3cftzPzdMK6aA4iZI4ILfYRbb9RgqICt2AxVnYZ4kkBvHOBxT/zN9ybHx/f5Ql2fkGCX6ANm6F8WCfqAS+Eq5AGcHJd2IFHagTMHAAj+mWBnDXuc81CjhsAi5dL2K8QCYI1aJ/PJtSSxEFXASv7C2I3ZB9/a0j/7nDn/j1pHsz9Jr8fNpxPBUAUUYD4wz5GBlmyAiORjtAIGDFwzSUwqiNZ1d1tPiB7/Q9VeI9KeJU16/knkEeQJEALjY4rkp74fCZiMDSA/PgvT/aT2gYgp5E/P29AKBQAo6TRth5T4VesQFb0i4K7RA2MZpgyFXCEQHCOixuYMPgy2L7+45ezSSKt2oUkURlpXkEMOLSiXPuDQZjk63N5bmzOSxQdLHX7AhwUEA0BAeQPJIQzkAuFlOK/GtyLdiGDKEBdllQ7YouxV2Xdwza9So4Kp5Z0yAgUhTlJgFzSFrznIHYIwKcCu2/L3LsCg6UI1b1/CA+ApIV5/32HqOIjdQusE4azip5Wc1b0q/QGIAlaWEJbXP3r/L+AEipw/+BtkQVY9fIM2i/ZhgVEgJO6DZ1ksVtlYdoQAPhVO0oKmYBmnAYco4DRCRB3TwCziptaE0auER9/VzRqKNOEYINOQg2m1l9GpGNQAhh1v6UmxNQh2M4+LmlUzll0OTjYQOaGlZAEMCrdhmBphaMBwBADrSQQc3//He8KgFETT7p6BHnjj2X9EXsDjrgBS6ihoAmcSQVYmE4JgYWFpp1waAQRoqDzxDhU+HxSnZHz/9JEY6Y5MJA+cwoWrt99+U3Mc/9g/NQTFaigAEtwB1yBzwzucZSX7RZEILhR1d5GDCsBLVUdIQvsldZfEJt5i/MHx2hGJZFkVVyK242iFeh58oBUFqIQbkfp2DV2X0CkAYgv1sU+P+I/HmBu8nErugdRnUWhfp+A/ddlbEH3uQlBsNobUEMHasK1HOYn8BEEvCUaiuigXRIKj+sGOPA4KAWz9/s7WxcgB4+a6/fI2osEwv4yOENAiPf+wQhbc/5f0gGisWuQaRFmGoIqguARWsBQgTTocDLMT5OJUQnhqdCEig+/EShKSEgTVV0MBMnz04BcshPnLk/+OaV0/dwKzB4QUt1NB6uTDfGOP+cNm9mEsBAFiM7AQh9AKVEU75vy68jeOxrUC4mDEuYO0oLqoSdHaEF2eXYYSm0V+oEOwpLmYFOF3Z4CmAeBTIGueiIw2xoKPzDBJVBXQ5g5O8/twwA+QguIjJt3+g0NQEcDfUXgO5gsqlTBLkQLdl86K3CWneitQ8sg/5oWAUJP2C3V3RoEyji5n4b9lB4t9pz2CA+cAFn1Z9I/uzYsU/ELtEBOCHYQQqGcFejV+yeuRJX31zsKV5IGjway9z6PLDxKwNEPsBuOEiqw57jGgOtZ1Y++T50AuMFl7hPIbhskiOwsATtRoc7rS7dXrpcgrMCGJca6ELJo+Y0be0BW5ZKGcFz4y8W9BduwcDnK9iO5fagsKpp9ANnvDPxeP8THNyIVFo1AMas8Qk5v2Ytm0LCCYAXqn+wQsPTBh/5Bcnne14Os3uCQt28vsK1WUESJFviBgAW//3u9PLxusXchcCR2WsNzv/ImvgZzzkUByDUAIrjTvmSHAowpJBQE4SUlxMxnARlQbIqkArVAJ6pBBvELCCKlkyCDAP45BYfEPfcUpfMch3Vn4bheYK4E66BxAxHSVd5INgEPgU/NBCDfNQ8Ho1CoINAPQAW/QT8OCIZlNFCB84XhoDChFByHGjx35v9BLgyhmojqHYb5QYXnuAecvua0hZe6BV9f7v4ibvgvamrmAc1TmaEir0LQ9h97eYAYVoM/nWA60i8Q3Ifezha9BqaaL3zvqd6IAuwwLSCCuCLuJWch4h30giPtyiAphKEBcCu9BV5wwzkMxID8rhMwdwMhcSFgrBT3RUTQboAUg3+p+Qe1IGarOioVnazmefV3lHpwA0AcLWCahUiXwePHWJsP+GH1gnp/we5KfOhJAbsj0H/BIEb04TbrTPsAyb2LLu93KwfCvn5PLAwrOXAa72eEQRo1CNdw5IprsAZ3hApy9zlcITG2vpCihsRSYxNS+J4vdBZ6B52eqRcQ/QXmSjAWSfa/5GA5qEg4iJFtm624AqXLrSA2gx8p1Mdqcghv41S0lSp/xAYs9gakQc4Ie2RTUYwYgt748mV+FU1Xgp14eW3XYZ6cdqGTNHwHICTwEeTPl0jEZwIgP9gDEaogeg5IHWCF+1eoAhvEKPB/EAeTRsM/pSAP5wjWEUMM1/NJRhwJbpJSgK7S7zF3EOsI5jBQBK9DV80Z8Y0COzvmWzJXgDl40KEC6cqvqgi4OB5cpgLFYK/1CvDiItXqC6/S87wfAUfPtxqfGNzlYaOjlf1IsHPPvffHgDAoEeEST4ZLZUd/RSo91/BjXY5ggWgQ4In3fyj4mUqPrInHOCLKO3wUwRsfyXpt1nEIRLrqcWeTuk7bigsbid1zD4iDRQtnIdQsyIXnFCn1I9D7ADgxEhOvR5AJosoUbu1FkJyYCi9OhQERoIx+4AX/YqUXQhtYEwKN4Cy1HntLMmtaAQpqfrT/UCoLSxeswjA5UWPPi0mjajUWxMTdVusNvt/ChMdmILK5IRMFu90BMEzFYHdg2GAgeYVHMMJIBTA7EFTx/5fpgTFXz9w/en0ZjD8kCDoKPNGwlB01BmoWQbh+AxR689mBponGJOr9OwmMu3dtJ/ylW1Tik4ElUPmR9RqII+pVhD9ychABMQ51gOIZg+/G+5mGIzLB1JJC5WhzYjhJ7IWmLDpA8jzsAafUPkB2WnFBF4iSxkq1ty7f25rv/+EQLOxs2oUdTSA9HIR9swdBlCcFe9owPC3XWDDC0ISVzsEVbSCF/sWdA5Fu4HJqankp2SeQCYYrImNalfmhpVxYrGkUS4LeSUjg8dD7+D7w/ybIfy7vlB9/HJ978zr7/45Qgajzj+4EjIK/ULHPRAOlKr/aG0AFcqCyu0GcW45Igh6JMJmhA49/U+cEssHNJhtXDC1MOya3j/sAiAGcrEtqtgjBD6wEzSDc7D8o6C8rIqAZyPk+NQoNLAZ1hR64Yl1FBY648smUYKnSg1Xwk/0DyRyArByMUobyByhCcPnOaPyoegREFS4jNfYAw+IHCjdC1J2WDZBke/OyN85J24WiXwDYPoJyYuCD238ulvuzwt6KgHf0shWKsqCFFGjB/w8HU8eeTED9wAAAAABJRU5ErkJggg==";
let ro = 0;
const Gi = (l) => {
  if (!l.environmentBRDFTexture) {
    const e = l.useDelayedTextureLoading;
    l.useDelayedTextureLoading = !1;
    const t = l._blockEntityCollection;
    l._blockEntityCollection = !1;
    const i = I.CreateFromBase64String(io, "EnvironmentBRDFTexture" + ro++, l, !0, !1, I.BILINEAR_SAMPLINGMODE);
    l._blockEntityCollection = t;
    const r = l.getEngine().getLoadedTexturesCache(), s = r.indexOf(i.getInternalTexture());
    s !== -1 && r.splice(s, 1), i.isRGBD = !0, i.wrapU = I.CLAMP_ADDRESSMODE, i.wrapV = I.CLAMP_ADDRESSMODE, l.environmentBRDFTexture = i, l.useDelayedTextureLoading = e, Ri.ExpandRGBDTexture(i);
    const n = l.getEngine().onContextRestoredObservable.add(() => {
      i.isRGBD = !0;
      const o = () => {
        i.isReady() ? Ri.ExpandRGBDTexture(i) : Me.SetImmediate(o);
      };
      o();
    });
    l.onDisposeObservable.add(() => {
      l.getEngine().onContextRestoredObservable.remove(n);
    });
  }
  return l.environmentBRDFTexture;
};
class so extends ye {
  constructor() {
    super(...arguments), this.BRDF_V_HEIGHT_CORRELATED = !1, this.MS_BRDF_ENERGY_CONSERVATION = !1, this.SPHERICAL_HARMONICS = !1, this.SPECULAR_GLOSSINESS_ENERGY_CONSERVATION = !1;
  }
}
class le extends we {
  /** @internal */
  _markAllSubMeshesAsMiscDirty() {
    this._internalMarkAllSubMeshesAsMiscDirty();
  }
  constructor(e, t = !0) {
    super(e, "PBRBRDF", 90, new so(), t), this._useEnergyConservation = le.DEFAULT_USE_ENERGY_CONSERVATION, this.useEnergyConservation = le.DEFAULT_USE_ENERGY_CONSERVATION, this._useSmithVisibilityHeightCorrelated = le.DEFAULT_USE_SMITH_VISIBILITY_HEIGHT_CORRELATED, this.useSmithVisibilityHeightCorrelated = le.DEFAULT_USE_SMITH_VISIBILITY_HEIGHT_CORRELATED, this._useSphericalHarmonics = le.DEFAULT_USE_SPHERICAL_HARMONICS, this.useSphericalHarmonics = le.DEFAULT_USE_SPHERICAL_HARMONICS, this._useSpecularGlossinessInputEnergyConservation = le.DEFAULT_USE_SPECULAR_GLOSSINESS_INPUT_ENERGY_CONSERVATION, this.useSpecularGlossinessInputEnergyConservation = le.DEFAULT_USE_SPECULAR_GLOSSINESS_INPUT_ENERGY_CONSERVATION, this._internalMarkAllSubMeshesAsMiscDirty = e._dirtyCallbacks[16], this._enable(!0);
  }
  prepareDefines(e) {
    e.BRDF_V_HEIGHT_CORRELATED = this._useSmithVisibilityHeightCorrelated, e.MS_BRDF_ENERGY_CONSERVATION = this._useEnergyConservation && this._useSmithVisibilityHeightCorrelated, e.SPHERICAL_HARMONICS = this._useSphericalHarmonics, e.SPECULAR_GLOSSINESS_ENERGY_CONSERVATION = this._useSpecularGlossinessInputEnergyConservation;
  }
  getClassName() {
    return "PBRBRDFConfiguration";
  }
}
le.DEFAULT_USE_ENERGY_CONSERVATION = !0;
le.DEFAULT_USE_SMITH_VISIBILITY_HEIGHT_CORRELATED = !0;
le.DEFAULT_USE_SPHERICAL_HARMONICS = !0;
le.DEFAULT_USE_SPECULAR_GLOSSINESS_INPUT_ENERGY_CONSERVATION = !0;
h([
  T(),
  v("_markAllSubMeshesAsMiscDirty")
], le.prototype, "useEnergyConservation", void 0);
h([
  T(),
  v("_markAllSubMeshesAsMiscDirty")
], le.prototype, "useSmithVisibilityHeightCorrelated", void 0);
h([
  T(),
  v("_markAllSubMeshesAsMiscDirty")
], le.prototype, "useSphericalHarmonics", void 0);
h([
  T(),
  v("_markAllSubMeshesAsMiscDirty")
], le.prototype, "useSpecularGlossinessInputEnergyConservation", void 0);
var Ci;
(function(l) {
  l[l.CW = 0] = "CW", l[l.CCW = 1] = "CCW";
})(Ci || (Ci = {}));
const De = [
  Math.sqrt(1 / (4 * Math.PI)),
  -Math.sqrt(3 / (4 * Math.PI)),
  Math.sqrt(3 / (4 * Math.PI)),
  -Math.sqrt(3 / (4 * Math.PI)),
  Math.sqrt(15 / (4 * Math.PI)),
  -Math.sqrt(15 / (4 * Math.PI)),
  Math.sqrt(5 / (16 * Math.PI)),
  -Math.sqrt(15 / (4 * Math.PI)),
  Math.sqrt(15 / (16 * Math.PI))
  // l22
], no = [
  () => 1,
  (l) => l.y,
  (l) => l.z,
  (l) => l.x,
  (l) => l.x * l.y,
  (l) => l.y * l.z,
  (l) => 3 * l.z * l.z - 1,
  (l) => l.x * l.z,
  (l) => l.x * l.x - l.y * l.y
  // l22
], Ve = (l, e) => De[l] * no[l](e), Ge = [Math.PI, 2 * Math.PI / 3, 2 * Math.PI / 3, 2 * Math.PI / 3, Math.PI / 4, Math.PI / 4, Math.PI / 4, Math.PI / 4, Math.PI / 4];
class Ct {
  constructor() {
    this.preScaled = !1, this.l00 = g.Zero(), this.l1_1 = g.Zero(), this.l10 = g.Zero(), this.l11 = g.Zero(), this.l2_2 = g.Zero(), this.l2_1 = g.Zero(), this.l20 = g.Zero(), this.l21 = g.Zero(), this.l22 = g.Zero();
  }
  /**
   * Adds a light to the spherical harmonics
   * @param direction the direction of the light
   * @param color the color of the light
   * @param deltaSolidAngle the delta solid angle of the light
   */
  addLight(e, t, i) {
    G.Vector3[0].set(t.r, t.g, t.b);
    const r = G.Vector3[0], s = G.Vector3[1];
    r.scaleToRef(i, s), s.scaleToRef(Ve(0, e), G.Vector3[2]), this.l00.addInPlace(G.Vector3[2]), s.scaleToRef(Ve(1, e), G.Vector3[2]), this.l1_1.addInPlace(G.Vector3[2]), s.scaleToRef(Ve(2, e), G.Vector3[2]), this.l10.addInPlace(G.Vector3[2]), s.scaleToRef(Ve(3, e), G.Vector3[2]), this.l11.addInPlace(G.Vector3[2]), s.scaleToRef(Ve(4, e), G.Vector3[2]), this.l2_2.addInPlace(G.Vector3[2]), s.scaleToRef(Ve(5, e), G.Vector3[2]), this.l2_1.addInPlace(G.Vector3[2]), s.scaleToRef(Ve(6, e), G.Vector3[2]), this.l20.addInPlace(G.Vector3[2]), s.scaleToRef(Ve(7, e), G.Vector3[2]), this.l21.addInPlace(G.Vector3[2]), s.scaleToRef(Ve(8, e), G.Vector3[2]), this.l22.addInPlace(G.Vector3[2]);
  }
  /**
   * Scales the spherical harmonics by the given amount
   * @param scale the amount to scale
   */
  scaleInPlace(e) {
    this.l00.scaleInPlace(e), this.l1_1.scaleInPlace(e), this.l10.scaleInPlace(e), this.l11.scaleInPlace(e), this.l2_2.scaleInPlace(e), this.l2_1.scaleInPlace(e), this.l20.scaleInPlace(e), this.l21.scaleInPlace(e), this.l22.scaleInPlace(e);
  }
  /**
   * Convert from incident radiance (Li) to irradiance (E) by applying convolution with the cosine-weighted hemisphere.
   *
   * ```
   * E_lm = A_l * L_lm
   * ```
   *
   * In spherical harmonics this convolution amounts to scaling factors for each frequency band.
   * This corresponds to equation 5 in "An Efficient Representation for Irradiance Environment Maps", where
   * the scaling factors are given in equation 9.
   */
  convertIncidentRadianceToIrradiance() {
    this.l00.scaleInPlace(Ge[0]), this.l1_1.scaleInPlace(Ge[1]), this.l10.scaleInPlace(Ge[2]), this.l11.scaleInPlace(Ge[3]), this.l2_2.scaleInPlace(Ge[4]), this.l2_1.scaleInPlace(Ge[5]), this.l20.scaleInPlace(Ge[6]), this.l21.scaleInPlace(Ge[7]), this.l22.scaleInPlace(Ge[8]);
  }
  /**
   * Convert from irradiance to outgoing radiance for Lambertian BDRF, suitable for efficient shader evaluation.
   *
   * ```
   * L = (1/pi) * E * rho
   * ```
   *
   * This is done by an additional scale by 1/pi, so is a fairly trivial operation but important conceptually.
   */
  convertIrradianceToLambertianRadiance() {
    this.scaleInPlace(1 / Math.PI);
  }
  /**
   * Integrates the reconstruction coefficients directly in to the SH preventing further
   * required operations at run time.
   *
   * This is simply done by scaling back the SH with Ylm constants parameter.
   * The trigonometric part being applied by the shader at run time.
   */
  preScaleForRendering() {
    this.preScaled = !0, this.l00.scaleInPlace(De[0]), this.l1_1.scaleInPlace(De[1]), this.l10.scaleInPlace(De[2]), this.l11.scaleInPlace(De[3]), this.l2_2.scaleInPlace(De[4]), this.l2_1.scaleInPlace(De[5]), this.l20.scaleInPlace(De[6]), this.l21.scaleInPlace(De[7]), this.l22.scaleInPlace(De[8]);
  }
  /**
   * update the spherical harmonics coefficients from the given array
   * @param data defines the 9x3 coefficients (l00, l1-1, l10, l11, l2-2, l2-1, l20, l21, l22)
   * @returns the spherical harmonics (this)
   */
  updateFromArray(e) {
    return g.FromArrayToRef(e[0], 0, this.l00), g.FromArrayToRef(e[1], 0, this.l1_1), g.FromArrayToRef(e[2], 0, this.l10), g.FromArrayToRef(e[3], 0, this.l11), g.FromArrayToRef(e[4], 0, this.l2_2), g.FromArrayToRef(e[5], 0, this.l2_1), g.FromArrayToRef(e[6], 0, this.l20), g.FromArrayToRef(e[7], 0, this.l21), g.FromArrayToRef(e[8], 0, this.l22), this;
  }
  /**
   * update the spherical harmonics coefficients from the given floats array
   * @param data defines the 9x3 coefficients (l00, l1-1, l10, l11, l2-2, l2-1, l20, l21, l22)
   * @returns the spherical harmonics (this)
   */
  updateFromFloatsArray(e) {
    return g.FromFloatsToRef(e[0], e[1], e[2], this.l00), g.FromFloatsToRef(e[3], e[4], e[5], this.l1_1), g.FromFloatsToRef(e[6], e[7], e[8], this.l10), g.FromFloatsToRef(e[9], e[10], e[11], this.l11), g.FromFloatsToRef(e[12], e[13], e[14], this.l2_2), g.FromFloatsToRef(e[15], e[16], e[17], this.l2_1), g.FromFloatsToRef(e[18], e[19], e[20], this.l20), g.FromFloatsToRef(e[21], e[22], e[23], this.l21), g.FromFloatsToRef(e[24], e[25], e[26], this.l22), this;
  }
  /**
   * Constructs a spherical harmonics from an array.
   * @param data defines the 9x3 coefficients (l00, l1-1, l10, l11, l2-2, l2-1, l20, l21, l22)
   * @returns the spherical harmonics
   */
  static FromArray(e) {
    return new Ct().updateFromArray(e);
  }
  // Keep for references.
  /**
   * Gets the spherical harmonics from polynomial
   * @param polynomial the spherical polynomial
   * @returns the spherical harmonics
   */
  static FromPolynomial(e) {
    const t = new Ct();
    return t.l00 = e.xx.scale(0.376127).add(e.yy.scale(0.376127)).add(e.zz.scale(0.376126)), t.l1_1 = e.y.scale(0.977204), t.l10 = e.z.scale(0.977204), t.l11 = e.x.scale(0.977204), t.l2_2 = e.xy.scale(1.16538), t.l2_1 = e.yz.scale(1.16538), t.l20 = e.zz.scale(1.34567).subtract(e.xx.scale(0.672834)).subtract(e.yy.scale(0.672834)), t.l21 = e.zx.scale(1.16538), t.l22 = e.xx.scale(1.16538).subtract(e.yy.scale(1.16538)), t.l1_1.scaleInPlace(-1), t.l11.scaleInPlace(-1), t.l2_1.scaleInPlace(-1), t.l21.scaleInPlace(-1), t.scaleInPlace(Math.PI), t;
  }
}
class Bt {
  constructor() {
    this.x = g.Zero(), this.y = g.Zero(), this.z = g.Zero(), this.xx = g.Zero(), this.yy = g.Zero(), this.zz = g.Zero(), this.xy = g.Zero(), this.yz = g.Zero(), this.zx = g.Zero();
  }
  /**
   * The spherical harmonics used to create the polynomials.
   */
  get preScaledHarmonics() {
    return this._harmonics || (this._harmonics = Ct.FromPolynomial(this)), this._harmonics.preScaled || this._harmonics.preScaleForRendering(), this._harmonics;
  }
  /**
   * Adds an ambient color to the spherical polynomial
   * @param color the color to add
   */
  addAmbient(e) {
    G.Vector3[0].copyFromFloats(e.r, e.g, e.b);
    const t = G.Vector3[0];
    this.xx.addInPlace(t), this.yy.addInPlace(t), this.zz.addInPlace(t);
  }
  /**
   * Scales the spherical polynomial by the given amount
   * @param scale the amount to scale
   */
  scaleInPlace(e) {
    this.x.scaleInPlace(e), this.y.scaleInPlace(e), this.z.scaleInPlace(e), this.xx.scaleInPlace(e), this.yy.scaleInPlace(e), this.zz.scaleInPlace(e), this.yz.scaleInPlace(e), this.zx.scaleInPlace(e), this.xy.scaleInPlace(e);
  }
  /**
   * Updates the spherical polynomial from harmonics
   * @param harmonics the spherical harmonics
   * @returns the spherical polynomial
   */
  updateFromHarmonics(e) {
    return this._harmonics = e, this.x.copyFrom(e.l11), this.x.scaleInPlace(1.02333).scaleInPlace(-1), this.y.copyFrom(e.l1_1), this.y.scaleInPlace(1.02333).scaleInPlace(-1), this.z.copyFrom(e.l10), this.z.scaleInPlace(1.02333), this.xx.copyFrom(e.l00), G.Vector3[0].copyFrom(e.l20).scaleInPlace(0.247708), G.Vector3[1].copyFrom(e.l22).scaleInPlace(0.429043), this.xx.scaleInPlace(0.886277).subtractInPlace(G.Vector3[0]).addInPlace(G.Vector3[1]), this.yy.copyFrom(e.l00), this.yy.scaleInPlace(0.886277).subtractInPlace(G.Vector3[0]).subtractInPlace(G.Vector3[1]), this.zz.copyFrom(e.l00), G.Vector3[0].copyFrom(e.l20).scaleInPlace(0.495417), this.zz.scaleInPlace(0.886277).addInPlace(G.Vector3[0]), this.yz.copyFrom(e.l2_1), this.yz.scaleInPlace(0.858086).scaleInPlace(-1), this.zx.copyFrom(e.l21), this.zx.scaleInPlace(0.858086).scaleInPlace(-1), this.xy.copyFrom(e.l2_2), this.xy.scaleInPlace(0.858086), this.scaleInPlace(1 / Math.PI), this;
  }
  /**
   * Gets the spherical polynomial from harmonics
   * @param harmonics the spherical harmonics
   * @returns the spherical polynomial
   */
  static FromHarmonics(e) {
    return new Bt().updateFromHarmonics(e);
  }
  /**
   * Constructs a spherical polynomial from an array.
   * @param data defines the 9x3 coefficients (x, y, z, xx, yy, zz, yz, zx, xy)
   * @returns the spherical polynomial
   */
  static FromArray(e) {
    const t = new Bt();
    return g.FromArrayToRef(e[0], 0, t.x), g.FromArrayToRef(e[1], 0, t.y), g.FromArrayToRef(e[2], 0, t.z), g.FromArrayToRef(e[3], 0, t.xx), g.FromArrayToRef(e[4], 0, t.yy), g.FromArrayToRef(e[5], 0, t.zz), g.FromArrayToRef(e[6], 0, t.yz), g.FromArrayToRef(e[7], 0, t.zx), g.FromArrayToRef(e[8], 0, t.xy), t;
  }
}
class at {
  constructor(e, t, i, r) {
    this.name = e, this.worldAxisForNormal = t, this.worldAxisForFileX = i, this.worldAxisForFileY = r;
  }
}
class Xi {
  /**
   * Converts a texture to the according Spherical Polynomial data.
   * This extracts the first 3 orders only as they are the only one used in the lighting.
   *
   * @param texture The texture to extract the information from.
   * @returns The Spherical Polynomial data.
   */
  static ConvertCubeMapTextureToSphericalPolynomial(e) {
    var t;
    if (!e.isCube)
      return null;
    (t = e.getScene()) === null || t === void 0 || t.getEngine().flushFramebuffer();
    const i = e.getSize().width, r = e.readPixels(0, void 0, void 0, !1), s = e.readPixels(1, void 0, void 0, !1);
    let n, o;
    e.isRenderTarget ? (n = e.readPixels(3, void 0, void 0, !1), o = e.readPixels(2, void 0, void 0, !1)) : (n = e.readPixels(2, void 0, void 0, !1), o = e.readPixels(3, void 0, void 0, !1));
    const a = e.readPixels(4, void 0, void 0, !1), f = e.readPixels(5, void 0, void 0, !1), c = e.gammaSpace, d = 5;
    let E = 0;
    return (e.textureType == 1 || e.textureType == 2) && (E = 1), new Promise((u) => {
      Promise.all([s, r, n, o, a, f]).then(([_, p, A, R, N, O]) => {
        const L = {
          size: i,
          right: p,
          left: _,
          up: A,
          down: R,
          front: N,
          back: O,
          format: d,
          type: E,
          gammaSpace: c
        };
        u(this.ConvertCubeMapToSphericalPolynomial(L));
      });
    });
  }
  /**
   * Compute the area on the unit sphere of the rectangle defined by (x,y) and the origin
   * See https://www.rorydriscoll.com/2012/01/15/cubemap-texel-solid-angle/
   * @param x
   * @param y
   */
  static _AreaElement(e, t) {
    return Math.atan2(e * t, Math.sqrt(e * e + t * t + 1));
  }
  /**
   * Converts a cubemap to the according Spherical Polynomial data.
   * This extracts the first 3 orders only as they are the only one used in the lighting.
   *
   * @param cubeInfo The Cube map to extract the information from.
   * @returns The Spherical Polynomial data.
   */
  static ConvertCubeMapToSphericalPolynomial(e) {
    const t = new Ct();
    let i = 0;
    const r = 2 / e.size, s = r, n = 0.5 * r, o = n - 1;
    for (let E = 0; E < 6; E++) {
      const u = this._FileFaces[E], _ = e[u.name];
      let p = o;
      const A = e.format === 5 ? 4 : 3;
      for (let R = 0; R < e.size; R++) {
        let N = o;
        for (let O = 0; O < e.size; O++) {
          const L = u.worldAxisForFileX.scale(N).add(u.worldAxisForFileY.scale(p)).add(u.worldAxisForNormal);
          L.normalize();
          const U = this._AreaElement(N - n, p - n) - this._AreaElement(N - n, p + n) - this._AreaElement(N + n, p - n) + this._AreaElement(N + n, p + n);
          let y = _[R * e.size * A + O * A + 0], D = _[R * e.size * A + O * A + 1], w = _[R * e.size * A + O * A + 2];
          isNaN(y) && (y = 0), isNaN(D) && (D = 0), isNaN(w) && (w = 0), e.type === 0 && (y /= 255, D /= 255, w /= 255), e.gammaSpace && (y = Math.pow(be.Clamp(y), Kt), D = Math.pow(be.Clamp(D), Kt), w = Math.pow(be.Clamp(w), Kt));
          const X = 4096;
          y = be.Clamp(y, 0, X), D = be.Clamp(D, 0, X), w = be.Clamp(w, 0, X);
          const H = new K(y, D, w);
          t.addLight(L, H, U), i += U, N += r;
        }
        p += s;
      }
    }
    const d = 4 * Math.PI * 6 / 6 / i;
    return t.scaleInPlace(d), t.convertIncidentRadianceToIrradiance(), t.convertIrradianceToLambertianRadiance(), Bt.FromHarmonics(t);
  }
}
Xi._FileFaces = [
  new at("right", new g(1, 0, 0), new g(0, 0, -1), new g(0, -1, 0)),
  new at("left", new g(-1, 0, 0), new g(0, 0, 1), new g(0, -1, 0)),
  new at("up", new g(0, 1, 0), new g(1, 0, 0), new g(0, 0, 1)),
  new at("down", new g(0, -1, 0), new g(1, 0, 0), new g(0, 0, -1)),
  new at("front", new g(0, 0, 1), new g(1, 0, 0), new g(0, -1, 0)),
  new at("back", new g(0, 0, -1), new g(-1, 0, 0), new g(0, -1, 0))
  // -Z bottom
];
Q.prototype.forceSphericalPolynomialsRecompute = function() {
  this._texture && (this._texture._sphericalPolynomial = null, this._texture._sphericalPolynomialPromise = null, this._texture._sphericalPolynomialComputed = !1);
};
Object.defineProperty(Q.prototype, "sphericalPolynomial", {
  get: function() {
    if (this._texture) {
      if (this._texture._sphericalPolynomial || this._texture._sphericalPolynomialComputed)
        return this._texture._sphericalPolynomial;
      if (this._texture.isReady)
        return this._texture._sphericalPolynomialPromise || (this._texture._sphericalPolynomialPromise = Xi.ConvertCubeMapTextureToSphericalPolynomial(this), this._texture._sphericalPolynomialPromise === null ? this._texture._sphericalPolynomialComputed = !0 : this._texture._sphericalPolynomialPromise.then((l) => {
          this._texture._sphericalPolynomial = l, this._texture._sphericalPolynomialComputed = !0;
        })), null;
    }
    return null;
  },
  set: function(l) {
    this._texture && (this._texture._sphericalPolynomial = l);
  },
  enumerable: !0,
  configurable: !0
});
const ao = "pbrFragmentDeclaration", oo = `uniform vec4 vEyePosition;
uniform vec3 vReflectionColor;
uniform vec4 vAlbedoColor;
uniform vec4 vLightingIntensity;
uniform vec4 vReflectivityColor;
uniform vec4 vMetallicReflectanceFactors;
uniform vec3 vEmissiveColor;
uniform float visibility;
uniform vec3 vAmbientColor;
#ifdef ALBEDO
uniform vec2 vAlbedoInfos;
#endif
#ifdef AMBIENT
uniform vec4 vAmbientInfos;
#endif
#ifdef BUMP
uniform vec3 vBumpInfos;
uniform vec2 vTangentSpaceParams;
#endif
#ifdef OPACITY
uniform vec2 vOpacityInfos;
#endif
#ifdef EMISSIVE
uniform vec2 vEmissiveInfos;
#endif
#ifdef LIGHTMAP
uniform vec2 vLightmapInfos;
#endif
#ifdef REFLECTIVITY
uniform vec3 vReflectivityInfos;
#endif
#ifdef MICROSURFACEMAP
uniform vec2 vMicroSurfaceSamplerInfos;
#endif
#if defined(REFLECTIONMAP_SPHERICAL) || defined(REFLECTIONMAP_PROJECTION) || defined(SS_REFRACTION) || defined(PREPASS)
uniform mat4 view;
#endif
#ifdef REFLECTION
uniform vec2 vReflectionInfos;
#ifdef REALTIME_FILTERING
uniform vec2 vReflectionFilteringInfo;
#endif
uniform mat4 reflectionMatrix;
uniform vec3 vReflectionMicrosurfaceInfos;
#if defined(USE_LOCAL_REFLECTIONMAP_CUBIC) && defined(REFLECTIONMAP_CUBIC)
uniform vec3 vReflectionPosition;
uniform vec3 vReflectionSize; 
#endif
#endif
#if defined(SS_REFRACTION) && defined(SS_USE_LOCAL_REFRACTIONMAP_CUBIC)
uniform vec3 vRefractionPosition;
uniform vec3 vRefractionSize; 
#endif
#ifdef CLEARCOAT
uniform vec2 vClearCoatParams;
uniform vec4 vClearCoatRefractionParams;
#if defined(CLEARCOAT_TEXTURE) || defined(CLEARCOAT_TEXTURE_ROUGHNESS)
uniform vec4 vClearCoatInfos;
#endif
#ifdef CLEARCOAT_TEXTURE
uniform mat4 clearCoatMatrix;
#endif
#ifdef CLEARCOAT_TEXTURE_ROUGHNESS
uniform mat4 clearCoatRoughnessMatrix;
#endif
#ifdef CLEARCOAT_BUMP
uniform vec2 vClearCoatBumpInfos;
uniform vec2 vClearCoatTangentSpaceParams;
uniform mat4 clearCoatBumpMatrix;
#endif
#ifdef CLEARCOAT_TINT
uniform vec4 vClearCoatTintParams;
uniform float clearCoatColorAtDistance;
#ifdef CLEARCOAT_TINT_TEXTURE
uniform vec2 vClearCoatTintInfos;
uniform mat4 clearCoatTintMatrix;
#endif
#endif
#endif
#ifdef IRIDESCENCE
uniform vec4 vIridescenceParams;
#if defined(IRIDESCENCE_TEXTURE) || defined(IRIDESCENCE_THICKNESS_TEXTURE)
uniform vec4 vIridescenceInfos;
#endif
#ifdef IRIDESCENCE_TEXTURE
uniform mat4 iridescenceMatrix;
#endif
#ifdef IRIDESCENCE_THICKNESS_TEXTURE
uniform mat4 iridescenceThicknessMatrix;
#endif
#endif
#ifdef ANISOTROPIC
uniform vec3 vAnisotropy;
#ifdef ANISOTROPIC_TEXTURE
uniform vec2 vAnisotropyInfos;
uniform mat4 anisotropyMatrix;
#endif
#endif
#ifdef SHEEN
uniform vec4 vSheenColor;
#ifdef SHEEN_ROUGHNESS
uniform float vSheenRoughness;
#endif
#if defined(SHEEN_TEXTURE) || defined(SHEEN_TEXTURE_ROUGHNESS)
uniform vec4 vSheenInfos;
#endif
#ifdef SHEEN_TEXTURE
uniform mat4 sheenMatrix;
#endif
#ifdef SHEEN_TEXTURE_ROUGHNESS
uniform mat4 sheenRoughnessMatrix;
#endif
#endif
#ifdef SUBSURFACE
#ifdef SS_REFRACTION
uniform vec4 vRefractionMicrosurfaceInfos;
uniform vec4 vRefractionInfos;
uniform mat4 refractionMatrix;
#ifdef REALTIME_FILTERING
uniform vec2 vRefractionFilteringInfo;
#endif
#endif
#ifdef SS_THICKNESSANDMASK_TEXTURE
uniform vec2 vThicknessInfos;
uniform mat4 thicknessMatrix;
#endif
#ifdef SS_REFRACTIONINTENSITY_TEXTURE
uniform vec2 vRefractionIntensityInfos;
uniform mat4 refractionIntensityMatrix;
#endif
#ifdef SS_TRANSLUCENCYINTENSITY_TEXTURE
uniform vec2 vTranslucencyIntensityInfos;
uniform mat4 translucencyIntensityMatrix;
#endif
uniform vec2 vThicknessParam;
uniform vec3 vDiffusionDistance;
uniform vec4 vTintColor;
uniform vec3 vSubSurfaceIntensity;
#endif
#ifdef PREPASS
#ifdef SS_SCATTERING
uniform float scatteringDiffusionProfile;
#endif
#endif
#if DEBUGMODE>0
uniform vec2 vDebugMode;
#endif
#ifdef DETAIL
uniform vec4 vDetailInfos;
#endif
#include<decalFragmentDeclaration>
#ifdef USESPHERICALFROMREFLECTIONMAP
#ifdef SPHERICAL_HARMONICS
uniform vec3 vSphericalL00;
uniform vec3 vSphericalL1_1;
uniform vec3 vSphericalL10;
uniform vec3 vSphericalL11;
uniform vec3 vSphericalL2_2;
uniform vec3 vSphericalL2_1;
uniform vec3 vSphericalL20;
uniform vec3 vSphericalL21;
uniform vec3 vSphericalL22;
#else
uniform vec3 vSphericalX;
uniform vec3 vSphericalY;
uniform vec3 vSphericalZ;
uniform vec3 vSphericalXX_ZZ;
uniform vec3 vSphericalYY_ZZ;
uniform vec3 vSphericalZZ;
uniform vec3 vSphericalXY;
uniform vec3 vSphericalYZ;
uniform vec3 vSphericalZX;
#endif
#endif
#define ADDITIONAL_FRAGMENT_DECLARATION
`;
C.IncludesShadersStore[ao] = oo;
const lo = "pbrUboDeclaration", fo = `layout(std140,column_major) uniform;
uniform Material {
vec2 vAlbedoInfos;
vec4 vAmbientInfos;
vec2 vOpacityInfos;
vec2 vEmissiveInfos;
vec2 vLightmapInfos;
vec3 vReflectivityInfos;
vec2 vMicroSurfaceSamplerInfos;
vec2 vReflectionInfos;
vec2 vReflectionFilteringInfo;
vec3 vReflectionPosition;
vec3 vReflectionSize;
vec3 vBumpInfos;
mat4 albedoMatrix;
mat4 ambientMatrix;
mat4 opacityMatrix;
mat4 emissiveMatrix;
mat4 lightmapMatrix;
mat4 reflectivityMatrix;
mat4 microSurfaceSamplerMatrix;
mat4 bumpMatrix;
vec2 vTangentSpaceParams;
mat4 reflectionMatrix;
vec3 vReflectionColor;
vec4 vAlbedoColor;
vec4 vLightingIntensity;
vec3 vReflectionMicrosurfaceInfos;
float pointSize;
vec4 vReflectivityColor;
vec3 vEmissiveColor;
vec3 vAmbientColor;
vec2 vDebugMode;
vec4 vMetallicReflectanceFactors;
vec2 vMetallicReflectanceInfos;
mat4 metallicReflectanceMatrix;
vec2 vReflectanceInfos;
mat4 reflectanceMatrix;
vec3 vSphericalL00;
vec3 vSphericalL1_1;
vec3 vSphericalL10;
vec3 vSphericalL11;
vec3 vSphericalL2_2;
vec3 vSphericalL2_1;
vec3 vSphericalL20;
vec3 vSphericalL21;
vec3 vSphericalL22;
vec3 vSphericalX;
vec3 vSphericalY;
vec3 vSphericalZ;
vec3 vSphericalXX_ZZ;
vec3 vSphericalYY_ZZ;
vec3 vSphericalZZ;
vec3 vSphericalXY;
vec3 vSphericalYZ;
vec3 vSphericalZX;
#define ADDITIONAL_UBO_DECLARATION
};
#include<sceneUboDeclaration>
#include<meshUboDeclaration>
`;
C.IncludesShadersStore[lo] = fo;
const co = "pbrFragmentExtraDeclaration", ho = `varying vec3 vPositionW;
#if DEBUGMODE>0
varying vec4 vClipSpacePosition;
#endif
#include<mainUVVaryingDeclaration>[1..7]
#ifdef NORMAL
varying vec3 vNormalW;
#if defined(USESPHERICALFROMREFLECTIONMAP) && defined(USESPHERICALINVERTEX)
varying vec3 vEnvironmentIrradiance;
#endif
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vec4 vColor;
#endif
`;
C.IncludesShadersStore[co] = ho;
const uo = "samplerFragmentAlternateDeclaration", Eo = `#ifdef _DEFINENAME_
#if _DEFINENAME_DIRECTUV==1
#define v_VARYINGNAME_UV vMainUV1
#elif _DEFINENAME_DIRECTUV==2
#define v_VARYINGNAME_UV vMainUV2
#elif _DEFINENAME_DIRECTUV==3
#define v_VARYINGNAME_UV vMainUV3
#elif _DEFINENAME_DIRECTUV==4
#define v_VARYINGNAME_UV vMainUV4
#elif _DEFINENAME_DIRECTUV==5
#define v_VARYINGNAME_UV vMainUV5
#elif _DEFINENAME_DIRECTUV==6
#define v_VARYINGNAME_UV vMainUV6
#else
varying vec2 v_VARYINGNAME_UV;
#endif
#endif
`;
C.IncludesShadersStore[uo] = Eo;
const _o = "pbrFragmentSamplersDeclaration", mo = `#include<samplerFragmentDeclaration>(_DEFINENAME_,ALBEDO,_VARYINGNAME_,Albedo,_SAMPLERNAME_,albedo)
#include<samplerFragmentDeclaration>(_DEFINENAME_,AMBIENT,_VARYINGNAME_,Ambient,_SAMPLERNAME_,ambient)
#include<samplerFragmentDeclaration>(_DEFINENAME_,OPACITY,_VARYINGNAME_,Opacity,_SAMPLERNAME_,opacity)
#include<samplerFragmentDeclaration>(_DEFINENAME_,EMISSIVE,_VARYINGNAME_,Emissive,_SAMPLERNAME_,emissive)
#include<samplerFragmentDeclaration>(_DEFINENAME_,LIGHTMAP,_VARYINGNAME_,Lightmap,_SAMPLERNAME_,lightmap)
#include<samplerFragmentDeclaration>(_DEFINENAME_,REFLECTIVITY,_VARYINGNAME_,Reflectivity,_SAMPLERNAME_,reflectivity)
#include<samplerFragmentDeclaration>(_DEFINENAME_,MICROSURFACEMAP,_VARYINGNAME_,MicroSurfaceSampler,_SAMPLERNAME_,microSurface)
#include<samplerFragmentDeclaration>(_DEFINENAME_,METALLIC_REFLECTANCE,_VARYINGNAME_,MetallicReflectance,_SAMPLERNAME_,metallicReflectance)
#include<samplerFragmentDeclaration>(_DEFINENAME_,REFLECTANCE,_VARYINGNAME_,Reflectance,_SAMPLERNAME_,reflectance)
#include<samplerFragmentDeclaration>(_DEFINENAME_,DECAL,_VARYINGNAME_,Decal,_SAMPLERNAME_,decal)
#ifdef CLEARCOAT
#include<samplerFragmentDeclaration>(_DEFINENAME_,CLEARCOAT_TEXTURE,_VARYINGNAME_,ClearCoat,_SAMPLERNAME_,clearCoat)
#include<samplerFragmentAlternateDeclaration>(_DEFINENAME_,CLEARCOAT_TEXTURE_ROUGHNESS,_VARYINGNAME_,ClearCoatRoughness)
#if defined(CLEARCOAT_TEXTURE_ROUGHNESS) && !defined(CLEARCOAT_TEXTURE_ROUGHNESS_IDENTICAL)
uniform sampler2D clearCoatRoughnessSampler;
#endif
#include<samplerFragmentDeclaration>(_DEFINENAME_,CLEARCOAT_BUMP,_VARYINGNAME_,ClearCoatBump,_SAMPLERNAME_,clearCoatBump)
#include<samplerFragmentDeclaration>(_DEFINENAME_,CLEARCOAT_TINT_TEXTURE,_VARYINGNAME_,ClearCoatTint,_SAMPLERNAME_,clearCoatTint)
#endif
#ifdef IRIDESCENCE
#include<samplerFragmentDeclaration>(_DEFINENAME_,IRIDESCENCE_TEXTURE,_VARYINGNAME_,Iridescence,_SAMPLERNAME_,iridescence)
#include<samplerFragmentDeclaration>(_DEFINENAME_,IRIDESCENCE_THICKNESS_TEXTURE,_VARYINGNAME_,IridescenceThickness,_SAMPLERNAME_,iridescenceThickness)
#endif
#ifdef SHEEN
#include<samplerFragmentDeclaration>(_DEFINENAME_,SHEEN_TEXTURE,_VARYINGNAME_,Sheen,_SAMPLERNAME_,sheen)
#include<samplerFragmentAlternateDeclaration>(_DEFINENAME_,SHEEN_TEXTURE_ROUGHNESS,_VARYINGNAME_,SheenRoughness)
#if defined(SHEEN_ROUGHNESS) && defined(SHEEN_TEXTURE_ROUGHNESS) && !defined(SHEEN_TEXTURE_ROUGHNESS_IDENTICAL)
uniform sampler2D sheenRoughnessSampler;
#endif
#endif
#ifdef ANISOTROPIC
#include<samplerFragmentDeclaration>(_DEFINENAME_,ANISOTROPIC_TEXTURE,_VARYINGNAME_,Anisotropy,_SAMPLERNAME_,anisotropy)
#endif
#ifdef REFLECTION
#ifdef REFLECTIONMAP_3D
#define sampleReflection(s,c) textureCube(s,c)
uniform samplerCube reflectionSampler;
#ifdef LODBASEDMICROSFURACE
#define sampleReflectionLod(s,c,l) textureCubeLodEXT(s,c,l)
#else
uniform samplerCube reflectionSamplerLow;
uniform samplerCube reflectionSamplerHigh;
#endif
#ifdef USEIRRADIANCEMAP
uniform samplerCube irradianceSampler;
#endif
#else
#define sampleReflection(s,c) texture2D(s,c)
uniform sampler2D reflectionSampler;
#ifdef LODBASEDMICROSFURACE
#define sampleReflectionLod(s,c,l) texture2DLodEXT(s,c,l)
#else
uniform sampler2D reflectionSamplerLow;
uniform sampler2D reflectionSamplerHigh;
#endif
#ifdef USEIRRADIANCEMAP
uniform sampler2D irradianceSampler;
#endif
#endif
#ifdef REFLECTIONMAP_SKYBOX
varying vec3 vPositionUVW;
#else
#if defined(REFLECTIONMAP_EQUIRECTANGULAR_FIXED) || defined(REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED)
varying vec3 vDirectionW;
#endif
#endif
#endif
#ifdef ENVIRONMENTBRDF
uniform sampler2D environmentBrdfSampler;
#endif
#ifdef SUBSURFACE
#ifdef SS_REFRACTION
#ifdef SS_REFRACTIONMAP_3D
#define sampleRefraction(s,c) textureCube(s,c)
uniform samplerCube refractionSampler;
#ifdef LODBASEDMICROSFURACE
#define sampleRefractionLod(s,c,l) textureCubeLodEXT(s,c,l)
#else
uniform samplerCube refractionSamplerLow;
uniform samplerCube refractionSamplerHigh;
#endif
#else
#define sampleRefraction(s,c) texture2D(s,c)
uniform sampler2D refractionSampler;
#ifdef LODBASEDMICROSFURACE
#define sampleRefractionLod(s,c,l) texture2DLodEXT(s,c,l)
#else
uniform sampler2D refractionSamplerLow;
uniform sampler2D refractionSamplerHigh;
#endif
#endif
#endif
#include<samplerFragmentDeclaration>(_DEFINENAME_,SS_THICKNESSANDMASK_TEXTURE,_VARYINGNAME_,Thickness,_SAMPLERNAME_,thickness)
#include<samplerFragmentDeclaration>(_DEFINENAME_,SS_REFRACTIONINTENSITY_TEXTURE,_VARYINGNAME_,RefractionIntensity,_SAMPLERNAME_,refractionIntensity)
#include<samplerFragmentDeclaration>(_DEFINENAME_,SS_TRANSLUCENCYINTENSITY_TEXTURE,_VARYINGNAME_,TranslucencyIntensity,_SAMPLERNAME_,translucencyIntensity)
#endif
`;
C.IncludesShadersStore[_o] = mo;
const po = "subSurfaceScatteringFunctions", To = `bool testLightingForSSS(float diffusionProfile)
{
return diffusionProfile<1.;
}`;
C.IncludesShadersStore[po] = To;
const Ao = "importanceSampling", go = `vec3 hemisphereCosSample(vec2 u) {
float phi=2.*PI*u.x;
float cosTheta2=1.-u.y;
float cosTheta=sqrt(cosTheta2);
float sinTheta=sqrt(1.-cosTheta2);
return vec3(sinTheta*cos(phi),sinTheta*sin(phi),cosTheta);
}
vec3 hemisphereImportanceSampleDggx(vec2 u,float a) {
float phi=2.*PI*u.x;
float cosTheta2=(1.-u.y)/(1.+(a+1.)*((a-1.)*u.y));
float cosTheta=sqrt(cosTheta2);
float sinTheta=sqrt(1.-cosTheta2);
return vec3(sinTheta*cos(phi),sinTheta*sin(phi),cosTheta);
}
vec3 hemisphereImportanceSampleDCharlie(vec2 u,float a) { 
float phi=2.*PI*u.x;
float sinTheta=pow(u.y,a/(2.*a+1.));
float cosTheta=sqrt(1.-sinTheta*sinTheta);
return vec3(sinTheta*cos(phi),sinTheta*sin(phi),cosTheta);
}`;
C.IncludesShadersStore[Ao] = go;
const So = "pbrHelperFunctions", Ro = `#define RECIPROCAL_PI2 0.15915494
#define RECIPROCAL_PI 0.31830988618
#define MINIMUMVARIANCE 0.0005
float convertRoughnessToAverageSlope(float roughness)
{
return square(roughness)+MINIMUMVARIANCE;
}
float fresnelGrazingReflectance(float reflectance0) {
float reflectance90=saturate(reflectance0*25.0);
return reflectance90;
}
vec2 getAARoughnessFactors(vec3 normalVector) {
#ifdef SPECULARAA
vec3 nDfdx=dFdx(normalVector.xyz);
vec3 nDfdy=dFdy(normalVector.xyz);
float slopeSquare=max(dot(nDfdx,nDfdx),dot(nDfdy,nDfdy));
float geometricRoughnessFactor=pow(saturate(slopeSquare),0.333);
float geometricAlphaGFactor=sqrt(slopeSquare);
geometricAlphaGFactor*=0.75;
return vec2(geometricRoughnessFactor,geometricAlphaGFactor);
#else
return vec2(0.);
#endif
}
#ifdef ANISOTROPIC
vec2 getAnisotropicRoughness(float alphaG,float anisotropy) {
float alphaT=max(alphaG*(1.0+anisotropy),MINIMUMVARIANCE);
float alphaB=max(alphaG*(1.0-anisotropy),MINIMUMVARIANCE);
return vec2(alphaT,alphaB);
}
vec3 getAnisotropicBentNormals(const vec3 T,const vec3 B,const vec3 N,const vec3 V,float anisotropy) {
vec3 anisotropicFrameDirection=anisotropy>=0.0 ? B : T;
vec3 anisotropicFrameTangent=cross(normalize(anisotropicFrameDirection),V);
vec3 anisotropicFrameNormal=cross(anisotropicFrameTangent,anisotropicFrameDirection);
vec3 anisotropicNormal=normalize(mix(N,anisotropicFrameNormal,abs(anisotropy)));
return anisotropicNormal;
}
#endif
#if defined(CLEARCOAT) || defined(SS_REFRACTION)
vec3 cocaLambert(vec3 alpha,float distance) {
return exp(-alpha*distance);
}
vec3 cocaLambert(float NdotVRefract,float NdotLRefract,vec3 alpha,float thickness) {
return cocaLambert(alpha,(thickness*((NdotLRefract+NdotVRefract)/(NdotLRefract*NdotVRefract))));
}
vec3 computeColorAtDistanceInMedia(vec3 color,float distance) {
return -log(color)/distance;
}
vec3 computeClearCoatAbsorption(float NdotVRefract,float NdotLRefract,vec3 clearCoatColor,float clearCoatThickness,float clearCoatIntensity) {
vec3 clearCoatAbsorption=mix(vec3(1.0),
cocaLambert(NdotVRefract,NdotLRefract,clearCoatColor,clearCoatThickness),
clearCoatIntensity);
return clearCoatAbsorption;
}
#endif
#ifdef MICROSURFACEAUTOMATIC
float computeDefaultMicroSurface(float microSurface,vec3 reflectivityColor)
{
const float kReflectivityNoAlphaWorkflow_SmoothnessMax=0.95;
float reflectivityLuminance=getLuminance(reflectivityColor);
float reflectivityLuma=sqrt(reflectivityLuminance);
microSurface=reflectivityLuma*kReflectivityNoAlphaWorkflow_SmoothnessMax;
return microSurface;
}
#endif
`;
C.IncludesShadersStore[So] = Ro;
const Co = "harmonicsFunctions", vo = `#ifdef USESPHERICALFROMREFLECTIONMAP
#ifdef SPHERICAL_HARMONICS
vec3 computeEnvironmentIrradiance(vec3 normal) {
return vSphericalL00
+ vSphericalL1_1*(normal.y)
+ vSphericalL10*(normal.z)
+ vSphericalL11*(normal.x)
+ vSphericalL2_2*(normal.y*normal.x)
+ vSphericalL2_1*(normal.y*normal.z)
+ vSphericalL20*((3.0*normal.z*normal.z)-1.0)
+ vSphericalL21*(normal.z*normal.x)
+ vSphericalL22*(normal.x*normal.x-(normal.y*normal.y));
}
#else
vec3 computeEnvironmentIrradiance(vec3 normal) {
float Nx=normal.x;
float Ny=normal.y;
float Nz=normal.z;
vec3 C1=vSphericalZZ.rgb;
vec3 Cx=vSphericalX.rgb;
vec3 Cy=vSphericalY.rgb;
vec3 Cz=vSphericalZ.rgb;
vec3 Cxx_zz=vSphericalXX_ZZ.rgb;
vec3 Cyy_zz=vSphericalYY_ZZ.rgb;
vec3 Cxy=vSphericalXY.rgb;
vec3 Cyz=vSphericalYZ.rgb;
vec3 Czx=vSphericalZX.rgb;
vec3 a1=Cyy_zz*Ny+Cy;
vec3 a2=Cyz*Nz+a1;
vec3 b1=Czx*Nz+Cx;
vec3 b2=Cxy*Ny+b1;
vec3 b3=Cxx_zz*Nx+b2;
vec3 t1=Cz *Nz+C1;
vec3 t2=a2 *Ny+t1;
vec3 t3=b3 *Nx+t2;
return t3;
}
#endif
#endif
`;
C.IncludesShadersStore[Co] = vo;
const Io = "pbrDirectLightingSetupFunctions", Mo = `struct preLightingInfo
{
vec3 lightOffset;
float lightDistanceSquared;
float lightDistance;
float attenuation;
vec3 L;
vec3 H;
float NdotV;
float NdotLUnclamped;
float NdotL;
float VdotH;
float roughness;
#ifdef IRIDESCENCE
float iridescenceIntensity;
#endif
};
preLightingInfo computePointAndSpotPreLightingInfo(vec4 lightData,vec3 V,vec3 N) {
preLightingInfo result;
result.lightOffset=lightData.xyz-vPositionW;
result.lightDistanceSquared=dot(result.lightOffset,result.lightOffset);
result.lightDistance=sqrt(result.lightDistanceSquared);
result.L=normalize(result.lightOffset);
result.H=normalize(V+result.L);
result.VdotH=saturate(dot(V,result.H));
result.NdotLUnclamped=dot(N,result.L);
result.NdotL=saturateEps(result.NdotLUnclamped);
return result;
}
preLightingInfo computeDirectionalPreLightingInfo(vec4 lightData,vec3 V,vec3 N) {
preLightingInfo result;
result.lightDistance=length(-lightData.xyz);
result.L=normalize(-lightData.xyz);
result.H=normalize(V+result.L);
result.VdotH=saturate(dot(V,result.H));
result.NdotLUnclamped=dot(N,result.L);
result.NdotL=saturateEps(result.NdotLUnclamped);
return result;
}
preLightingInfo computeHemisphericPreLightingInfo(vec4 lightData,vec3 V,vec3 N) {
preLightingInfo result;
result.NdotL=dot(N,lightData.xyz)*0.5+0.5;
result.NdotL=saturateEps(result.NdotL);
result.NdotLUnclamped=result.NdotL;
#ifdef SPECULARTERM
result.L=normalize(lightData.xyz);
result.H=normalize(V+result.L);
result.VdotH=saturate(dot(V,result.H));
#endif
return result;
}`;
C.IncludesShadersStore[Io] = Mo;
const xo = "pbrDirectLightingFalloffFunctions", No = `float computeDistanceLightFalloff_Standard(vec3 lightOffset,float range)
{
return max(0.,1.0-length(lightOffset)/range);
}
float computeDistanceLightFalloff_Physical(float lightDistanceSquared)
{
return 1.0/maxEps(lightDistanceSquared);
}
float computeDistanceLightFalloff_GLTF(float lightDistanceSquared,float inverseSquaredRange)
{
float lightDistanceFalloff=1.0/maxEps(lightDistanceSquared);
float factor=lightDistanceSquared*inverseSquaredRange;
float attenuation=saturate(1.0-factor*factor);
attenuation*=attenuation;
lightDistanceFalloff*=attenuation;
return lightDistanceFalloff;
}
float computeDistanceLightFalloff(vec3 lightOffset,float lightDistanceSquared,float range,float inverseSquaredRange)
{
#ifdef USEPHYSICALLIGHTFALLOFF
return computeDistanceLightFalloff_Physical(lightDistanceSquared);
#elif defined(USEGLTFLIGHTFALLOFF)
return computeDistanceLightFalloff_GLTF(lightDistanceSquared,inverseSquaredRange);
#else
return computeDistanceLightFalloff_Standard(lightOffset,range);
#endif
}
float computeDirectionalLightFalloff_Standard(vec3 lightDirection,vec3 directionToLightCenterW,float cosHalfAngle,float exponent)
{
float falloff=0.0;
float cosAngle=maxEps(dot(-lightDirection,directionToLightCenterW));
if (cosAngle>=cosHalfAngle)
{
falloff=max(0.,pow(cosAngle,exponent));
}
return falloff;
}
float computeDirectionalLightFalloff_Physical(vec3 lightDirection,vec3 directionToLightCenterW,float cosHalfAngle)
{
const float kMinusLog2ConeAngleIntensityRatio=6.64385618977; 
float concentrationKappa=kMinusLog2ConeAngleIntensityRatio/(1.0-cosHalfAngle);
vec4 lightDirectionSpreadSG=vec4(-lightDirection*concentrationKappa,-concentrationKappa);
float falloff=exp2(dot(vec4(directionToLightCenterW,1.0),lightDirectionSpreadSG));
return falloff;
}
float computeDirectionalLightFalloff_GLTF(vec3 lightDirection,vec3 directionToLightCenterW,float lightAngleScale,float lightAngleOffset)
{
float cd=dot(-lightDirection,directionToLightCenterW);
float falloff=saturate(cd*lightAngleScale+lightAngleOffset);
falloff*=falloff;
return falloff;
}
float computeDirectionalLightFalloff(vec3 lightDirection,vec3 directionToLightCenterW,float cosHalfAngle,float exponent,float lightAngleScale,float lightAngleOffset)
{
#ifdef USEPHYSICALLIGHTFALLOFF
return computeDirectionalLightFalloff_Physical(lightDirection,directionToLightCenterW,cosHalfAngle);
#elif defined(USEGLTFLIGHTFALLOFF)
return computeDirectionalLightFalloff_GLTF(lightDirection,directionToLightCenterW,lightAngleScale,lightAngleOffset);
#else
return computeDirectionalLightFalloff_Standard(lightDirection,directionToLightCenterW,cosHalfAngle,exponent);
#endif
}`;
C.IncludesShadersStore[xo] = No;
const Oo = "pbrBRDFFunctions", Lo = `#define FRESNEL_MAXIMUM_ON_ROUGH 0.25
#ifdef MS_BRDF_ENERGY_CONSERVATION
vec3 getEnergyConservationFactor(const vec3 specularEnvironmentR0,const vec3 environmentBrdf) {
return 1.0+specularEnvironmentR0*(1.0/environmentBrdf.y-1.0);
}
#endif
#ifdef ENVIRONMENTBRDF
vec3 getBRDFLookup(float NdotV,float perceptualRoughness) {
vec2 UV=vec2(NdotV,perceptualRoughness);
vec4 brdfLookup=texture2D(environmentBrdfSampler,UV);
#ifdef ENVIRONMENTBRDF_RGBD
brdfLookup.rgb=fromRGBD(brdfLookup.rgba);
#endif
return brdfLookup.rgb;
}
vec3 getReflectanceFromBRDFLookup(const vec3 specularEnvironmentR0,const vec3 specularEnvironmentR90,const vec3 environmentBrdf) {
#ifdef BRDF_V_HEIGHT_CORRELATED
vec3 reflectance=(specularEnvironmentR90-specularEnvironmentR0)*environmentBrdf.x+specularEnvironmentR0*environmentBrdf.y;
#else
vec3 reflectance=specularEnvironmentR0*environmentBrdf.x+specularEnvironmentR90*environmentBrdf.y;
#endif
return reflectance;
}
vec3 getReflectanceFromBRDFLookup(const vec3 specularEnvironmentR0,const vec3 environmentBrdf) {
#ifdef BRDF_V_HEIGHT_CORRELATED
vec3 reflectance=mix(environmentBrdf.xxx,environmentBrdf.yyy,specularEnvironmentR0);
#else
vec3 reflectance=specularEnvironmentR0*environmentBrdf.x+environmentBrdf.y;
#endif
return reflectance;
}
#endif
/* NOT USED
#if defined(SHEEN) && defined(SHEEN_SOFTER)
float getBRDFLookupCharlieSheen(float NdotV,float perceptualRoughness)
{
float c=1.0-NdotV;
float c3=c*c*c;
return 0.65584461*c3+1.0/(4.16526551+exp(-7.97291361*perceptualRoughness+6.33516894));
}
#endif
*/
#if !defined(ENVIRONMENTBRDF) || defined(REFLECTIONMAP_SKYBOX) || defined(ALPHAFRESNEL)
vec3 getReflectanceFromAnalyticalBRDFLookup_Jones(float VdotN,vec3 reflectance0,vec3 reflectance90,float smoothness)
{
float weight=mix(FRESNEL_MAXIMUM_ON_ROUGH,1.0,smoothness);
return reflectance0+weight*(reflectance90-reflectance0)*pow5(saturate(1.0-VdotN));
}
#endif
#if defined(SHEEN) && defined(ENVIRONMENTBRDF)
/**
* The sheen BRDF not containing F can be easily stored in the blue channel of the BRDF texture.
* The blue channel contains DCharlie*VAshikhmin*NdotL as a lokkup table
*/
vec3 getSheenReflectanceFromBRDFLookup(const vec3 reflectance0,const vec3 environmentBrdf) {
vec3 sheenEnvironmentReflectance=reflectance0*environmentBrdf.b;
return sheenEnvironmentReflectance;
}
#endif
vec3 fresnelSchlickGGX(float VdotH,vec3 reflectance0,vec3 reflectance90)
{
return reflectance0+(reflectance90-reflectance0)*pow5(1.0-VdotH);
}
float fresnelSchlickGGX(float VdotH,float reflectance0,float reflectance90)
{
return reflectance0+(reflectance90-reflectance0)*pow5(1.0-VdotH);
}
#ifdef CLEARCOAT
vec3 getR0RemappedForClearCoat(vec3 f0) {
#ifdef CLEARCOAT_DEFAULTIOR
#ifdef MOBILE
return saturate(f0*(f0*0.526868+0.529324)-0.0482256);
#else
return saturate(f0*(f0*(0.941892-0.263008*f0)+0.346479)-0.0285998);
#endif
#else
vec3 s=sqrt(f0);
vec3 t=(vClearCoatRefractionParams.z+vClearCoatRefractionParams.w*s)/(vClearCoatRefractionParams.w+vClearCoatRefractionParams.z*s);
return square(t);
#endif
}
#endif
#ifdef IRIDESCENCE
const mat3 XYZ_TO_REC709=mat3(
3.2404542,-0.9692660, 0.0556434,
-1.5371385, 1.8760108,-0.2040259,
-0.4985314, 0.0415560, 1.0572252
);
vec3 getIORTfromAirToSurfaceR0(vec3 f0) {
vec3 sqrtF0=sqrt(f0);
return (1.+sqrtF0)/(1.-sqrtF0);
}
vec3 getR0fromIORs(vec3 iorT,float iorI) {
return square((iorT-vec3(iorI))/(iorT+vec3(iorI)));
}
float getR0fromIORs(float iorT,float iorI) {
return square((iorT-iorI)/(iorT+iorI));
}
vec3 evalSensitivity(float opd,vec3 shift) {
float phase=2.0*PI*opd*1.0e-9;
const vec3 val=vec3(5.4856e-13,4.4201e-13,5.2481e-13);
const vec3 pos=vec3(1.6810e+06,1.7953e+06,2.2084e+06);
const vec3 var=vec3(4.3278e+09,9.3046e+09,6.6121e+09);
vec3 xyz=val*sqrt(2.0*PI*var)*cos(pos*phase+shift)*exp(-square(phase)*var);
xyz.x+=9.7470e-14*sqrt(2.0*PI*4.5282e+09)*cos(2.2399e+06*phase+shift[0])*exp(-4.5282e+09*square(phase));
xyz/=1.0685e-7;
vec3 srgb=XYZ_TO_REC709*xyz;
return srgb;
}
vec3 evalIridescence(float outsideIOR,float eta2,float cosTheta1,float thinFilmThickness,vec3 baseF0) {
vec3 I=vec3(1.0);
float iridescenceIOR=mix(outsideIOR,eta2,smoothstep(0.0,0.03,thinFilmThickness));
float sinTheta2Sq=square(outsideIOR/iridescenceIOR)*(1.0-square(cosTheta1));
float cosTheta2Sq=1.0-sinTheta2Sq;
if (cosTheta2Sq<0.0) {
return I;
}
float cosTheta2=sqrt(cosTheta2Sq);
float R0=getR0fromIORs(iridescenceIOR,outsideIOR);
float R12=fresnelSchlickGGX(cosTheta1,R0,1.);
float R21=R12;
float T121=1.0-R12;
float phi12=0.0;
if (iridescenceIOR<outsideIOR) phi12=PI;
float phi21=PI-phi12;
vec3 baseIOR=getIORTfromAirToSurfaceR0(clamp(baseF0,0.0,0.9999)); 
vec3 R1=getR0fromIORs(baseIOR,iridescenceIOR);
vec3 R23=fresnelSchlickGGX(cosTheta2,R1,vec3(1.));
vec3 phi23=vec3(0.0);
if (baseIOR[0]<iridescenceIOR) phi23[0]=PI;
if (baseIOR[1]<iridescenceIOR) phi23[1]=PI;
if (baseIOR[2]<iridescenceIOR) phi23[2]=PI;
float opd=2.0*iridescenceIOR*thinFilmThickness*cosTheta2;
vec3 phi=vec3(phi21)+phi23;
vec3 R123=clamp(R12*R23,1e-5,0.9999);
vec3 r123=sqrt(R123);
vec3 Rs=square(T121)*R23/(vec3(1.0)-R123);
vec3 C0=R12+Rs;
I=C0;
vec3 Cm=Rs-T121;
for (int m=1; m<=2; ++m)
{
Cm*=r123;
vec3 Sm=2.0*evalSensitivity(float(m)*opd,float(m)*phi);
I+=Cm*Sm;
}
return max(I,vec3(0.0));
}
#endif
float normalDistributionFunction_TrowbridgeReitzGGX(float NdotH,float alphaG)
{
float a2=square(alphaG);
float d=NdotH*NdotH*(a2-1.0)+1.0;
return a2/(PI*d*d);
}
#ifdef SHEEN
float normalDistributionFunction_CharlieSheen(float NdotH,float alphaG)
{
float invR=1./alphaG;
float cos2h=NdotH*NdotH;
float sin2h=1.-cos2h;
return (2.+invR)*pow(sin2h,invR*.5)/(2.*PI);
}
#endif
#ifdef ANISOTROPIC
float normalDistributionFunction_BurleyGGX_Anisotropic(float NdotH,float TdotH,float BdotH,const vec2 alphaTB) {
float a2=alphaTB.x*alphaTB.y;
vec3 v=vec3(alphaTB.y*TdotH,alphaTB.x *BdotH,a2*NdotH);
float v2=dot(v,v);
float w2=a2/v2;
return a2*w2*w2*RECIPROCAL_PI;
}
#endif
#ifdef BRDF_V_HEIGHT_CORRELATED
float smithVisibility_GGXCorrelated(float NdotL,float NdotV,float alphaG) {
#ifdef MOBILE
float GGXV=NdotL*(NdotV*(1.0-alphaG)+alphaG);
float GGXL=NdotV*(NdotL*(1.0-alphaG)+alphaG);
return 0.5/(GGXV+GGXL);
#else
float a2=alphaG*alphaG;
float GGXV=NdotL*sqrt(NdotV*(NdotV-a2*NdotV)+a2);
float GGXL=NdotV*sqrt(NdotL*(NdotL-a2*NdotL)+a2);
return 0.5/(GGXV+GGXL);
#endif
}
#else
float smithVisibilityG1_TrowbridgeReitzGGXFast(float dot,float alphaG)
{
#ifdef MOBILE
return 1.0/(dot+alphaG+(1.0-alphaG)*dot ));
#else
float alphaSquared=alphaG*alphaG;
return 1.0/(dot+sqrt(alphaSquared+(1.0-alphaSquared)*dot*dot));
#endif
}
float smithVisibility_TrowbridgeReitzGGXFast(float NdotL,float NdotV,float alphaG)
{
float visibility=smithVisibilityG1_TrowbridgeReitzGGXFast(NdotL,alphaG)*smithVisibilityG1_TrowbridgeReitzGGXFast(NdotV,alphaG);
return visibility;
}
#endif
#ifdef ANISOTROPIC
float smithVisibility_GGXCorrelated_Anisotropic(float NdotL,float NdotV,float TdotV,float BdotV,float TdotL,float BdotL,const vec2 alphaTB) {
float lambdaV=NdotL*length(vec3(alphaTB.x*TdotV,alphaTB.y*BdotV,NdotV));
float lambdaL=NdotV*length(vec3(alphaTB.x*TdotL,alphaTB.y*BdotL,NdotL));
float v=0.5/(lambdaV+lambdaL);
return v;
}
#endif
#ifdef CLEARCOAT
float visibility_Kelemen(float VdotH) {
return 0.25/(VdotH*VdotH); 
}
#endif
#ifdef SHEEN
float visibility_Ashikhmin(float NdotL,float NdotV)
{
return 1./(4.*(NdotL+NdotV-NdotL*NdotV));
}
/* NOT USED
#ifdef SHEEN_SOFTER
float l(float x,float alphaG)
{
float oneMinusAlphaSq=(1.0-alphaG)*(1.0-alphaG);
float a=mix(21.5473,25.3245,oneMinusAlphaSq);
float b=mix(3.82987,3.32435,oneMinusAlphaSq);
float c=mix(0.19823,0.16801,oneMinusAlphaSq);
float d=mix(-1.97760,-1.27393,oneMinusAlphaSq);
float e=mix(-4.32054,-4.85967,oneMinusAlphaSq);
return a/(1.0+b*pow(x,c))+d*x+e;
}
float lambdaSheen(float cosTheta,float alphaG)
{
return abs(cosTheta)<0.5 ? exp(l(cosTheta,alphaG)) : exp(2.0*l(0.5,alphaG)-l(1.0-cosTheta,alphaG));
}
float visibility_CharlieSheen(float NdotL,float NdotV,float alphaG)
{
float G=1.0/(1.0+lambdaSheen(NdotV,alphaG)+lambdaSheen(NdotL,alphaG));
return G/(4.0*NdotV*NdotL);
}
#endif
*/
#endif
float diffuseBRDF_Burley(float NdotL,float NdotV,float VdotH,float roughness) {
float diffuseFresnelNV=pow5(saturateEps(1.0-NdotL));
float diffuseFresnelNL=pow5(saturateEps(1.0-NdotV));
float diffuseFresnel90=0.5+2.0*VdotH*VdotH*roughness;
float fresnel =
(1.0+(diffuseFresnel90-1.0)*diffuseFresnelNL) *
(1.0+(diffuseFresnel90-1.0)*diffuseFresnelNV);
return fresnel/PI;
}
#ifdef SS_TRANSLUCENCY
vec3 transmittanceBRDF_Burley(const vec3 tintColor,const vec3 diffusionDistance,float thickness) {
vec3 S=1./maxEps(diffusionDistance);
vec3 temp=exp((-0.333333333*thickness)*S);
return tintColor.rgb*0.25*(temp*temp*temp+3.0*temp);
}
float computeWrappedDiffuseNdotL(float NdotL,float w) {
float t=1.0+w;
float invt2=1.0/square(t);
return saturate((NdotL+w)*invt2);
}
#endif
`;
C.IncludesShadersStore[Oo] = Lo;
const Do = "hdrFilteringFunctions", Po = `#ifdef NUM_SAMPLES
#if NUM_SAMPLES>0
#if defined(WEBGL2) || defined(WEBGPU) || defined(NATIVE)
float radicalInverse_VdC(uint bits) 
{
bits=(bits<<16u) | (bits>>16u);
bits=((bits & 0x55555555u)<<1u) | ((bits & 0xAAAAAAAAu)>>1u);
bits=((bits & 0x33333333u)<<2u) | ((bits & 0xCCCCCCCCu)>>2u);
bits=((bits & 0x0F0F0F0Fu)<<4u) | ((bits & 0xF0F0F0F0u)>>4u);
bits=((bits & 0x00FF00FFu)<<8u) | ((bits & 0xFF00FF00u)>>8u);
return float(bits)*2.3283064365386963e-10; 
}
vec2 hammersley(uint i,uint N)
{
return vec2(float(i)/float(N),radicalInverse_VdC(i));
}
#else
float vanDerCorpus(int n,int base)
{
float invBase=1.0/float(base);
float denom =1.0;
float result =0.0;
for(int i=0; i<32; ++i)
{
if(n>0)
{
denom =mod(float(n),2.0);
result+=denom*invBase;
invBase=invBase/2.0;
n =int(float(n)/2.0);
}
}
return result;
}
vec2 hammersley(int i,int N)
{
return vec2(float(i)/float(N),vanDerCorpus(i,2));
}
#endif
float log4(float x) {
return log2(x)/2.;
}
const float NUM_SAMPLES_FLOAT=float(NUM_SAMPLES);
const float NUM_SAMPLES_FLOAT_INVERSED=1./NUM_SAMPLES_FLOAT;
const float K=4.;
#define inline
vec3 irradiance(samplerCube inputTexture,vec3 inputN,vec2 filteringInfo)
{
vec3 n=normalize(inputN);
vec3 result=vec3(0.0);
vec3 tangent=abs(n.z)<0.999 ? vec3(0.,0.,1.) : vec3(1.,0.,0.);
tangent=normalize(cross(tangent,n));
vec3 bitangent=cross(n,tangent);
mat3 tbn=mat3(tangent,bitangent,n);
float maxLevel=filteringInfo.y;
float dim0=filteringInfo.x;
float omegaP=(4.*PI)/(6.*dim0*dim0);
#if defined(WEBGL2) || defined(WEBGPU) || defined(NATIVE)
for(uint i=0u; i<NUM_SAMPLES; ++i)
#else
for(int i=0; i<NUM_SAMPLES; ++i)
#endif
{
vec2 Xi=hammersley(i,NUM_SAMPLES);
vec3 Ls=hemisphereCosSample(Xi);
Ls=normalize(Ls);
vec3 Ns=vec3(0.,0.,1.);
float NoL=dot(Ns,Ls);
if (NoL>0.) {
float pdf_inversed=PI/NoL;
float omegaS=NUM_SAMPLES_FLOAT_INVERSED*pdf_inversed;
float l=log4(omegaS)-log4(omegaP)+log4(K);
float mipLevel=clamp(l,0.0,maxLevel);
vec3 c=textureCubeLodEXT(inputTexture,tbn*Ls,mipLevel).rgb;
#ifdef GAMMA_INPUT
c=toLinearSpace(c);
#endif
result+=c;
}
}
result=result*NUM_SAMPLES_FLOAT_INVERSED;
return result;
}
#define inline
vec3 radiance(float alphaG,samplerCube inputTexture,vec3 inputN,vec2 filteringInfo)
{
vec3 n=normalize(inputN);
if (alphaG==0.) {
vec3 c=textureCube(inputTexture,n).rgb;
#ifdef GAMMA_INPUT
c=toLinearSpace(c);
#endif
return c;
} else {
vec3 result=vec3(0.);
vec3 tangent=abs(n.z)<0.999 ? vec3(0.,0.,1.) : vec3(1.,0.,0.);
tangent=normalize(cross(tangent,n));
vec3 bitangent=cross(n,tangent);
mat3 tbn=mat3(tangent,bitangent,n);
float maxLevel=filteringInfo.y;
float dim0=filteringInfo.x;
float omegaP=(4.*PI)/(6.*dim0*dim0);
float weight=0.;
#if defined(WEBGL2) || defined(WEBGPU) || defined(NATIVE)
for(uint i=0u; i<NUM_SAMPLES; ++i)
#else
for(int i=0; i<NUM_SAMPLES; ++i)
#endif
{
vec2 Xi=hammersley(i,NUM_SAMPLES);
vec3 H=hemisphereImportanceSampleDggx(Xi,alphaG);
float NoV=1.;
float NoH=H.z;
float NoH2=H.z*H.z;
float NoL=2.*NoH2-1.;
vec3 L=vec3(2.*NoH*H.x,2.*NoH*H.y,NoL);
L=normalize(L);
if (NoL>0.) {
float pdf_inversed=4./normalDistributionFunction_TrowbridgeReitzGGX(NoH,alphaG);
float omegaS=NUM_SAMPLES_FLOAT_INVERSED*pdf_inversed;
float l=log4(omegaS)-log4(omegaP)+log4(K);
float mipLevel=clamp(float(l),0.0,maxLevel);
weight+=NoL;
vec3 c=textureCubeLodEXT(inputTexture,tbn*L,mipLevel).rgb;
#ifdef GAMMA_INPUT
c=toLinearSpace(c);
#endif
result+=c*NoL;
}
}
result=result/weight;
return result;
}
}
#endif
#endif
`;
C.IncludesShadersStore[Do] = Po;
const bo = "pbrDirectLightingFunctions", Fo = `#define CLEARCOATREFLECTANCE90 1.0
struct lightingInfo
{
vec3 diffuse;
#ifdef SPECULARTERM
vec3 specular;
#endif
#ifdef CLEARCOAT
vec4 clearCoat;
#endif
#ifdef SHEEN
vec3 sheen;
#endif
};
float adjustRoughnessFromLightProperties(float roughness,float lightRadius,float lightDistance) {
#if defined(USEPHYSICALLIGHTFALLOFF) || defined(USEGLTFLIGHTFALLOFF)
float lightRoughness=lightRadius/lightDistance;
float totalRoughness=saturate(lightRoughness+roughness);
return totalRoughness;
#else
return roughness;
#endif
}
vec3 computeHemisphericDiffuseLighting(preLightingInfo info,vec3 lightColor,vec3 groundColor) {
return mix(groundColor,lightColor,info.NdotL);
}
vec3 computeDiffuseLighting(preLightingInfo info,vec3 lightColor) {
float diffuseTerm=diffuseBRDF_Burley(info.NdotL,info.NdotV,info.VdotH,info.roughness);
return diffuseTerm*info.attenuation*info.NdotL*lightColor;
}
#define inline
vec3 computeProjectionTextureDiffuseLighting(sampler2D projectionLightSampler,mat4 textureProjectionMatrix){
vec4 strq=textureProjectionMatrix*vec4(vPositionW,1.0);
strq/=strq.w;
vec3 textureColor=texture2D(projectionLightSampler,strq.xy).rgb;
return toLinearSpace(textureColor);
}
#ifdef SS_TRANSLUCENCY
vec3 computeDiffuseAndTransmittedLighting(preLightingInfo info,vec3 lightColor,vec3 transmittance) {
float NdotL=absEps(info.NdotLUnclamped);
float wrapNdotL=computeWrappedDiffuseNdotL(NdotL,0.02);
float trAdapt=step(0.,info.NdotLUnclamped);
vec3 transmittanceNdotL=mix(transmittance*wrapNdotL,vec3(wrapNdotL),trAdapt);
float diffuseTerm=diffuseBRDF_Burley(NdotL,info.NdotV,info.VdotH,info.roughness);
return diffuseTerm*transmittanceNdotL*info.attenuation*lightColor;
}
#endif
#ifdef SPECULARTERM
vec3 computeSpecularLighting(preLightingInfo info,vec3 N,vec3 reflectance0,vec3 reflectance90,float geometricRoughnessFactor,vec3 lightColor) {
float NdotH=saturateEps(dot(N,info.H));
float roughness=max(info.roughness,geometricRoughnessFactor);
float alphaG=convertRoughnessToAverageSlope(roughness);
vec3 fresnel=fresnelSchlickGGX(info.VdotH,reflectance0,reflectance90);
#ifdef IRIDESCENCE
fresnel=mix(fresnel,reflectance0,info.iridescenceIntensity);
#endif
float distribution=normalDistributionFunction_TrowbridgeReitzGGX(NdotH,alphaG);
#ifdef BRDF_V_HEIGHT_CORRELATED
float smithVisibility=smithVisibility_GGXCorrelated(info.NdotL,info.NdotV,alphaG);
#else
float smithVisibility=smithVisibility_TrowbridgeReitzGGXFast(info.NdotL,info.NdotV,alphaG);
#endif
vec3 specTerm=fresnel*distribution*smithVisibility;
return specTerm*info.attenuation*info.NdotL*lightColor;
}
#endif
#ifdef ANISOTROPIC
vec3 computeAnisotropicSpecularLighting(preLightingInfo info,vec3 V,vec3 N,vec3 T,vec3 B,float anisotropy,vec3 reflectance0,vec3 reflectance90,float geometricRoughnessFactor,vec3 lightColor) {
float NdotH=saturateEps(dot(N,info.H));
float TdotH=dot(T,info.H);
float BdotH=dot(B,info.H);
float TdotV=dot(T,V);
float BdotV=dot(B,V);
float TdotL=dot(T,info.L);
float BdotL=dot(B,info.L);
float alphaG=convertRoughnessToAverageSlope(info.roughness);
vec2 alphaTB=getAnisotropicRoughness(alphaG,anisotropy);
alphaTB=max(alphaTB,square(geometricRoughnessFactor));
vec3 fresnel=fresnelSchlickGGX(info.VdotH,reflectance0,reflectance90);
#ifdef IRIDESCENCE
fresnel=mix(fresnel,reflectance0,info.iridescenceIntensity);
#endif
float distribution=normalDistributionFunction_BurleyGGX_Anisotropic(NdotH,TdotH,BdotH,alphaTB);
float smithVisibility=smithVisibility_GGXCorrelated_Anisotropic(info.NdotL,info.NdotV,TdotV,BdotV,TdotL,BdotL,alphaTB);
vec3 specTerm=fresnel*distribution*smithVisibility;
return specTerm*info.attenuation*info.NdotL*lightColor;
}
#endif
#ifdef CLEARCOAT
vec4 computeClearCoatLighting(preLightingInfo info,vec3 Ncc,float geometricRoughnessFactor,float clearCoatIntensity,vec3 lightColor) {
float NccdotL=saturateEps(dot(Ncc,info.L));
float NccdotH=saturateEps(dot(Ncc,info.H));
float clearCoatRoughness=max(info.roughness,geometricRoughnessFactor);
float alphaG=convertRoughnessToAverageSlope(clearCoatRoughness);
float fresnel=fresnelSchlickGGX(info.VdotH,vClearCoatRefractionParams.x,CLEARCOATREFLECTANCE90);
fresnel*=clearCoatIntensity;
float distribution=normalDistributionFunction_TrowbridgeReitzGGX(NccdotH,alphaG);
float kelemenVisibility=visibility_Kelemen(info.VdotH);
float clearCoatTerm=fresnel*distribution*kelemenVisibility;
return vec4(
clearCoatTerm*info.attenuation*NccdotL*lightColor,
1.0-fresnel
);
}
vec3 computeClearCoatLightingAbsorption(float NdotVRefract,vec3 L,vec3 Ncc,vec3 clearCoatColor,float clearCoatThickness,float clearCoatIntensity) {
vec3 LRefract=-refract(L,Ncc,vClearCoatRefractionParams.y);
float NdotLRefract=saturateEps(dot(Ncc,LRefract));
vec3 absorption=computeClearCoatAbsorption(NdotVRefract,NdotLRefract,clearCoatColor,clearCoatThickness,clearCoatIntensity);
return absorption;
}
#endif
#ifdef SHEEN
vec3 computeSheenLighting(preLightingInfo info,vec3 N,vec3 reflectance0,vec3 reflectance90,float geometricRoughnessFactor,vec3 lightColor) {
float NdotH=saturateEps(dot(N,info.H));
float roughness=max(info.roughness,geometricRoughnessFactor);
float alphaG=convertRoughnessToAverageSlope(roughness);
float fresnel=1.;
float distribution=normalDistributionFunction_CharlieSheen(NdotH,alphaG);
/*#ifdef SHEEN_SOFTER
float visibility=visibility_CharlieSheen(info.NdotL,info.NdotV,alphaG);
#else */
float visibility=visibility_Ashikhmin(info.NdotL,info.NdotV);
/* #endif */
float sheenTerm=fresnel*distribution*visibility;
return sheenTerm*info.attenuation*info.NdotL*lightColor;
}
#endif
`;
C.IncludesShadersStore[bo] = Fo;
const yo = "pbrIBLFunctions", Uo = `#if defined(REFLECTION) || defined(SS_REFRACTION)
float getLodFromAlphaG(float cubeMapDimensionPixels,float microsurfaceAverageSlope) {
float microsurfaceAverageSlopeTexels=cubeMapDimensionPixels*microsurfaceAverageSlope;
float lod=log2(microsurfaceAverageSlopeTexels);
return lod;
}
float getLinearLodFromRoughness(float cubeMapDimensionPixels,float roughness) {
float lod=log2(cubeMapDimensionPixels)*roughness;
return lod;
}
#endif
#if defined(ENVIRONMENTBRDF) && defined(RADIANCEOCCLUSION)
float environmentRadianceOcclusion(float ambientOcclusion,float NdotVUnclamped) {
float temp=NdotVUnclamped+ambientOcclusion;
return saturate(square(temp)-1.0+ambientOcclusion);
}
#endif
#if defined(ENVIRONMENTBRDF) && defined(HORIZONOCCLUSION)
float environmentHorizonOcclusion(vec3 view,vec3 normal,vec3 geometricNormal) {
vec3 reflection=reflect(view,normal);
float temp=saturate(1.0+1.1*dot(reflection,geometricNormal));
return square(temp);
}
#endif
#if defined(LODINREFLECTIONALPHA) || defined(SS_LODINREFRACTIONALPHA)
#define UNPACK_LOD(x) (1.0-x)*255.0
float getLodFromAlphaG(float cubeMapDimensionPixels,float alphaG,float NdotV) {
float microsurfaceAverageSlope=alphaG;
microsurfaceAverageSlope*=sqrt(abs(NdotV));
return getLodFromAlphaG(cubeMapDimensionPixels,microsurfaceAverageSlope);
}
#endif
`;
C.IncludesShadersStore[yo] = Uo;
const wo = "pbrBlockAlbedoOpacity", Bo = `struct albedoOpacityOutParams
{
vec3 surfaceAlbedo;
float alpha;
};
#define pbr_inline
void albedoOpacityBlock(
in vec4 vAlbedoColor,
#ifdef ALBEDO
in vec4 albedoTexture,
in vec2 albedoInfos,
#endif
#ifdef OPACITY
in vec4 opacityMap,
in vec2 vOpacityInfos,
#endif
#ifdef DETAIL
in vec4 detailColor,
in vec4 vDetailInfos,
#endif
#ifdef DECAL
in vec4 decalColor,
in vec4 vDecalInfos,
#endif
out albedoOpacityOutParams outParams
)
{
vec3 surfaceAlbedo=vAlbedoColor.rgb;
float alpha=vAlbedoColor.a;
#ifdef ALBEDO
#if defined(ALPHAFROMALBEDO) || defined(ALPHATEST)
alpha*=albedoTexture.a;
#endif
#ifdef GAMMAALBEDO
surfaceAlbedo*=toLinearSpace(albedoTexture.rgb);
#else
surfaceAlbedo*=albedoTexture.rgb;
#endif
surfaceAlbedo*=albedoInfos.y;
#endif
#include<decalFragment>
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
surfaceAlbedo*=vColor.rgb;
#endif
#ifdef DETAIL
float detailAlbedo=2.0*mix(0.5,detailColor.r,vDetailInfos.y);
surfaceAlbedo.rgb=surfaceAlbedo.rgb*detailAlbedo*detailAlbedo; 
#endif
#define CUSTOM_FRAGMENT_UPDATE_ALBEDO
#ifdef OPACITY
#ifdef OPACITYRGB
alpha=getLuminance(opacityMap.rgb);
#else
alpha*=opacityMap.a;
#endif
alpha*=vOpacityInfos.y;
#endif
#if defined(VERTEXALPHA) || defined(INSTANCESCOLOR) && defined(INSTANCES)
alpha*=vColor.a;
#endif
#if !defined(SS_LINKREFRACTIONTOTRANSPARENCY) && !defined(ALPHAFRESNEL)
#ifdef ALPHATEST
if (alpha<ALPHATESTVALUE)
discard;
#ifndef ALPHABLEND
alpha=1.0;
#endif
#endif
#endif
outParams.surfaceAlbedo=surfaceAlbedo;
outParams.alpha=alpha;
}
`;
C.IncludesShadersStore[wo] = Bo;
const Vo = "pbrBlockReflectivity", Go = `struct reflectivityOutParams
{
float microSurface;
float roughness;
vec3 surfaceReflectivityColor;
#ifdef METALLICWORKFLOW
vec3 surfaceAlbedo;
#endif
#if defined(METALLICWORKFLOW) && defined(REFLECTIVITY) && defined(AOSTOREINMETALMAPRED)
vec3 ambientOcclusionColor;
#endif
#if DEBUGMODE>0
vec4 surfaceMetallicColorMap;
vec4 surfaceReflectivityColorMap;
vec2 metallicRoughness;
vec3 metallicF0;
#endif
};
#define pbr_inline
void reflectivityBlock(
in vec4 vReflectivityColor,
#ifdef METALLICWORKFLOW
in vec3 surfaceAlbedo,
in vec4 metallicReflectanceFactors,
#endif
#ifdef REFLECTIVITY
in vec3 reflectivityInfos,
in vec4 surfaceMetallicOrReflectivityColorMap,
#endif
#if defined(METALLICWORKFLOW) && defined(REFLECTIVITY) && defined(AOSTOREINMETALMAPRED)
in vec3 ambientOcclusionColorIn,
#endif
#ifdef MICROSURFACEMAP
in vec4 microSurfaceTexel,
#endif
#ifdef DETAIL
in vec4 detailColor,
in vec4 vDetailInfos,
#endif
out reflectivityOutParams outParams
)
{
float microSurface=vReflectivityColor.a;
vec3 surfaceReflectivityColor=vReflectivityColor.rgb;
#ifdef METALLICWORKFLOW
vec2 metallicRoughness=surfaceReflectivityColor.rg;
#ifdef REFLECTIVITY
#if DEBUGMODE>0
outParams.surfaceMetallicColorMap=surfaceMetallicOrReflectivityColorMap;
#endif
#ifdef AOSTOREINMETALMAPRED
vec3 aoStoreInMetalMap=vec3(surfaceMetallicOrReflectivityColorMap.r,surfaceMetallicOrReflectivityColorMap.r,surfaceMetallicOrReflectivityColorMap.r);
outParams.ambientOcclusionColor=mix(ambientOcclusionColorIn,aoStoreInMetalMap,reflectivityInfos.z);
#endif
#ifdef METALLNESSSTOREINMETALMAPBLUE
metallicRoughness.r*=surfaceMetallicOrReflectivityColorMap.b;
#else
metallicRoughness.r*=surfaceMetallicOrReflectivityColorMap.r;
#endif
#ifdef ROUGHNESSSTOREINMETALMAPALPHA
metallicRoughness.g*=surfaceMetallicOrReflectivityColorMap.a;
#else
#ifdef ROUGHNESSSTOREINMETALMAPGREEN
metallicRoughness.g*=surfaceMetallicOrReflectivityColorMap.g;
#endif
#endif
#endif
#ifdef DETAIL
float detailRoughness=mix(0.5,detailColor.b,vDetailInfos.w);
float loLerp=mix(0.,metallicRoughness.g,detailRoughness*2.);
float hiLerp=mix(metallicRoughness.g,1.,(detailRoughness-0.5)*2.);
metallicRoughness.g=mix(loLerp,hiLerp,step(detailRoughness,0.5));
#endif
#ifdef MICROSURFACEMAP
metallicRoughness.g*=microSurfaceTexel.r;
#endif
#if DEBUGMODE>0
outParams.metallicRoughness=metallicRoughness;
#endif
#define CUSTOM_FRAGMENT_UPDATE_METALLICROUGHNESS
microSurface=1.0-metallicRoughness.g;
vec3 baseColor=surfaceAlbedo;
#ifdef FROSTBITE_REFLECTANCE
outParams.surfaceAlbedo=baseColor.rgb*(1.0-metallicRoughness.r);
surfaceReflectivityColor=mix(0.16*reflectance*reflectance,baseColor,metallicRoughness.r);
#else
vec3 metallicF0=metallicReflectanceFactors.rgb;
#if DEBUGMODE>0
outParams.metallicF0=metallicF0;
#endif
outParams.surfaceAlbedo=mix(baseColor.rgb*(1.0-metallicF0),vec3(0.,0.,0.),metallicRoughness.r);
surfaceReflectivityColor=mix(metallicF0,baseColor,metallicRoughness.r);
#endif
#else
#ifdef REFLECTIVITY
surfaceReflectivityColor*=surfaceMetallicOrReflectivityColorMap.rgb;
#if DEBUGMODE>0
outParams.surfaceReflectivityColorMap=surfaceMetallicOrReflectivityColorMap;
#endif
#ifdef MICROSURFACEFROMREFLECTIVITYMAP
microSurface*=surfaceMetallicOrReflectivityColorMap.a;
microSurface*=reflectivityInfos.z;
#else
#ifdef MICROSURFACEAUTOMATIC
microSurface*=computeDefaultMicroSurface(microSurface,surfaceReflectivityColor);
#endif
#ifdef MICROSURFACEMAP
microSurface*=microSurfaceTexel.r;
#endif
#define CUSTOM_FRAGMENT_UPDATE_MICROSURFACE
#endif
#endif
#endif
microSurface=saturate(microSurface);
float roughness=1.-microSurface;
outParams.microSurface=microSurface;
outParams.roughness=roughness;
outParams.surfaceReflectivityColor=surfaceReflectivityColor;
}
`;
C.IncludesShadersStore[Vo] = Go;
const Xo = "pbrBlockAmbientOcclusion", Ho = `struct ambientOcclusionOutParams
{
vec3 ambientOcclusionColor;
#if DEBUGMODE>0
vec3 ambientOcclusionColorMap;
#endif
};
#define pbr_inline
void ambientOcclusionBlock(
#ifdef AMBIENT
in vec3 ambientOcclusionColorMap_,
in vec4 vAmbientInfos,
#endif
out ambientOcclusionOutParams outParams
)
{
vec3 ambientOcclusionColor=vec3(1.,1.,1.);
#ifdef AMBIENT
vec3 ambientOcclusionColorMap=ambientOcclusionColorMap_*vAmbientInfos.y;
#ifdef AMBIENTINGRAYSCALE
ambientOcclusionColorMap=vec3(ambientOcclusionColorMap.r,ambientOcclusionColorMap.r,ambientOcclusionColorMap.r);
#endif
ambientOcclusionColor=mix(ambientOcclusionColor,ambientOcclusionColorMap,vAmbientInfos.z);
#if DEBUGMODE>0
outParams.ambientOcclusionColorMap=ambientOcclusionColorMap;
#endif
#endif
outParams.ambientOcclusionColor=ambientOcclusionColor;
}
`;
C.IncludesShadersStore[Xo] = Ho;
const ko = "pbrBlockAlphaFresnel", zo = `#ifdef ALPHAFRESNEL
#if defined(ALPHATEST) || defined(ALPHABLEND)
struct alphaFresnelOutParams
{
float alpha;
};
#define pbr_inline
void alphaFresnelBlock(
in vec3 normalW,
in vec3 viewDirectionW,
in float alpha,
in float microSurface,
out alphaFresnelOutParams outParams
)
{
float opacityPerceptual=alpha;
#ifdef LINEARALPHAFRESNEL
float opacity0=opacityPerceptual;
#else
float opacity0=opacityPerceptual*opacityPerceptual;
#endif
float opacity90=fresnelGrazingReflectance(opacity0);
vec3 normalForward=faceforward(normalW,-viewDirectionW,normalW);
outParams.alpha=getReflectanceFromAnalyticalBRDFLookup_Jones(saturate(dot(viewDirectionW,normalForward)),vec3(opacity0),vec3(opacity90),sqrt(microSurface)).x;
#ifdef ALPHATEST
if (outParams.alpha<ALPHATESTVALUE)
discard;
#ifndef ALPHABLEND
outParams.alpha=1.0;
#endif
#endif
}
#endif
#endif
`;
C.IncludesShadersStore[ko] = zo;
const Wo = "pbrBlockAnisotropic", Yo = `#ifdef ANISOTROPIC
struct anisotropicOutParams
{
float anisotropy;
vec3 anisotropicTangent;
vec3 anisotropicBitangent;
vec3 anisotropicNormal;
#if DEBUGMODE>0
vec3 anisotropyMapData;
#endif
};
#define pbr_inline
void anisotropicBlock(
in vec3 vAnisotropy,
#ifdef ANISOTROPIC_TEXTURE
in vec3 anisotropyMapData,
#endif
in mat3 TBN,
in vec3 normalW,
in vec3 viewDirectionW,
out anisotropicOutParams outParams
)
{
float anisotropy=vAnisotropy.b;
vec3 anisotropyDirection=vec3(vAnisotropy.xy,0.);
#ifdef ANISOTROPIC_TEXTURE
anisotropy*=anisotropyMapData.b;
anisotropyDirection.rg*=anisotropyMapData.rg*2.0-1.0;
#if DEBUGMODE>0
outParams.anisotropyMapData=anisotropyMapData;
#endif
#endif
mat3 anisoTBN=mat3(normalize(TBN[0]),normalize(TBN[1]),normalize(TBN[2]));
vec3 anisotropicTangent=normalize(anisoTBN*anisotropyDirection);
vec3 anisotropicBitangent=normalize(cross(anisoTBN[2],anisotropicTangent));
outParams.anisotropy=anisotropy;
outParams.anisotropicTangent=anisotropicTangent;
outParams.anisotropicBitangent=anisotropicBitangent;
outParams.anisotropicNormal=getAnisotropicBentNormals(anisotropicTangent,anisotropicBitangent,normalW,viewDirectionW,anisotropy);
}
#endif
`;
C.IncludesShadersStore[Wo] = Yo;
const Qo = "pbrBlockReflection", Ko = `#ifdef REFLECTION
struct reflectionOutParams
{
vec4 environmentRadiance;
vec3 environmentIrradiance;
#ifdef REFLECTIONMAP_3D
vec3 reflectionCoords;
#else
vec2 reflectionCoords;
#endif
#ifdef SS_TRANSLUCENCY
#ifdef USESPHERICALFROMREFLECTIONMAP
#if !defined(NORMAL) || !defined(USESPHERICALINVERTEX)
vec3 irradianceVector;
#endif
#endif
#endif
};
#define pbr_inline
void createReflectionCoords(
in vec3 vPositionW,
in vec3 normalW,
#ifdef ANISOTROPIC
in anisotropicOutParams anisotropicOut,
#endif
#ifdef REFLECTIONMAP_3D
out vec3 reflectionCoords
#else
out vec2 reflectionCoords
#endif
)
{
#ifdef ANISOTROPIC
vec3 reflectionVector=computeReflectionCoords(vec4(vPositionW,1.0),anisotropicOut.anisotropicNormal);
#else
vec3 reflectionVector=computeReflectionCoords(vec4(vPositionW,1.0),normalW);
#endif
#ifdef REFLECTIONMAP_OPPOSITEZ
reflectionVector.z*=-1.0;
#endif
#ifdef REFLECTIONMAP_3D
reflectionCoords=reflectionVector;
#else
reflectionCoords=reflectionVector.xy;
#ifdef REFLECTIONMAP_PROJECTION
reflectionCoords/=reflectionVector.z;
#endif
reflectionCoords.y=1.0-reflectionCoords.y;
#endif
}
#define pbr_inline
#define inline
void sampleReflectionTexture(
in float alphaG,
in vec3 vReflectionMicrosurfaceInfos,
in vec2 vReflectionInfos,
in vec3 vReflectionColor,
#if defined(LODINREFLECTIONALPHA) && !defined(REFLECTIONMAP_SKYBOX)
in float NdotVUnclamped,
#endif
#ifdef LINEARSPECULARREFLECTION
in float roughness,
#endif
#ifdef REFLECTIONMAP_3D
in samplerCube reflectionSampler,
const vec3 reflectionCoords,
#else
in sampler2D reflectionSampler,
const vec2 reflectionCoords,
#endif
#ifndef LODBASEDMICROSFURACE
#ifdef REFLECTIONMAP_3D
in samplerCube reflectionSamplerLow,
in samplerCube reflectionSamplerHigh,
#else
in sampler2D reflectionSamplerLow,
in sampler2D reflectionSamplerHigh,
#endif
#endif
#ifdef REALTIME_FILTERING
in vec2 vReflectionFilteringInfo,
#endif
out vec4 environmentRadiance
)
{
#if defined(LODINREFLECTIONALPHA) && !defined(REFLECTIONMAP_SKYBOX)
float reflectionLOD=getLodFromAlphaG(vReflectionMicrosurfaceInfos.x,alphaG,NdotVUnclamped);
#elif defined(LINEARSPECULARREFLECTION)
float reflectionLOD=getLinearLodFromRoughness(vReflectionMicrosurfaceInfos.x,roughness);
#else
float reflectionLOD=getLodFromAlphaG(vReflectionMicrosurfaceInfos.x,alphaG);
#endif
#ifdef LODBASEDMICROSFURACE
reflectionLOD=reflectionLOD*vReflectionMicrosurfaceInfos.y+vReflectionMicrosurfaceInfos.z;
#ifdef LODINREFLECTIONALPHA
float automaticReflectionLOD=UNPACK_LOD(sampleReflection(reflectionSampler,reflectionCoords).a);
float requestedReflectionLOD=max(automaticReflectionLOD,reflectionLOD);
#else
float requestedReflectionLOD=reflectionLOD;
#endif
#ifdef REALTIME_FILTERING
environmentRadiance=vec4(radiance(alphaG,reflectionSampler,reflectionCoords,vReflectionFilteringInfo),1.0);
#else
environmentRadiance=sampleReflectionLod(reflectionSampler,reflectionCoords,reflectionLOD);
#endif
#else
float lodReflectionNormalized=saturate(reflectionLOD/log2(vReflectionMicrosurfaceInfos.x));
float lodReflectionNormalizedDoubled=lodReflectionNormalized*2.0;
vec4 environmentMid=sampleReflection(reflectionSampler,reflectionCoords);
if (lodReflectionNormalizedDoubled<1.0){
environmentRadiance=mix(
sampleReflection(reflectionSamplerHigh,reflectionCoords),
environmentMid,
lodReflectionNormalizedDoubled
);
} else {
environmentRadiance=mix(
environmentMid,
sampleReflection(reflectionSamplerLow,reflectionCoords),
lodReflectionNormalizedDoubled-1.0
);
}
#endif
#ifdef RGBDREFLECTION
environmentRadiance.rgb=fromRGBD(environmentRadiance);
#endif
#ifdef GAMMAREFLECTION
environmentRadiance.rgb=toLinearSpace(environmentRadiance.rgb);
#endif
environmentRadiance.rgb*=vReflectionInfos.x;
environmentRadiance.rgb*=vReflectionColor.rgb;
}
#define pbr_inline
#define inline
void reflectionBlock(
in vec3 vPositionW,
in vec3 normalW,
in float alphaG,
in vec3 vReflectionMicrosurfaceInfos,
in vec2 vReflectionInfos,
in vec3 vReflectionColor,
#ifdef ANISOTROPIC
in anisotropicOutParams anisotropicOut,
#endif
#if defined(LODINREFLECTIONALPHA) && !defined(REFLECTIONMAP_SKYBOX)
in float NdotVUnclamped,
#endif
#ifdef LINEARSPECULARREFLECTION
in float roughness,
#endif
#ifdef REFLECTIONMAP_3D
in samplerCube reflectionSampler,
#else
in sampler2D reflectionSampler,
#endif
#if defined(NORMAL) && defined(USESPHERICALINVERTEX)
in vec3 vEnvironmentIrradiance,
#endif
#ifdef USESPHERICALFROMREFLECTIONMAP
#if !defined(NORMAL) || !defined(USESPHERICALINVERTEX)
in mat4 reflectionMatrix,
#endif
#endif
#ifdef USEIRRADIANCEMAP
#ifdef REFLECTIONMAP_3D
in samplerCube irradianceSampler,
#else
in sampler2D irradianceSampler,
#endif
#endif
#ifndef LODBASEDMICROSFURACE
#ifdef REFLECTIONMAP_3D
in samplerCube reflectionSamplerLow,
in samplerCube reflectionSamplerHigh,
#else
in sampler2D reflectionSamplerLow,
in sampler2D reflectionSamplerHigh,
#endif
#endif
#ifdef REALTIME_FILTERING
in vec2 vReflectionFilteringInfo,
#endif
out reflectionOutParams outParams
)
{
vec4 environmentRadiance=vec4(0.,0.,0.,0.);
#ifdef REFLECTIONMAP_3D
vec3 reflectionCoords=vec3(0.);
#else
vec2 reflectionCoords=vec2(0.);
#endif
createReflectionCoords(
vPositionW,
normalW,
#ifdef ANISOTROPIC
anisotropicOut,
#endif
reflectionCoords
);
sampleReflectionTexture(
alphaG,
vReflectionMicrosurfaceInfos,
vReflectionInfos,
vReflectionColor,
#if defined(LODINREFLECTIONALPHA) && !defined(REFLECTIONMAP_SKYBOX)
NdotVUnclamped,
#endif
#ifdef LINEARSPECULARREFLECTION
roughness,
#endif
#ifdef REFLECTIONMAP_3D
reflectionSampler,
reflectionCoords,
#else
reflectionSampler,
reflectionCoords,
#endif
#ifndef LODBASEDMICROSFURACE
reflectionSamplerLow,
reflectionSamplerHigh,
#endif
#ifdef REALTIME_FILTERING
vReflectionFilteringInfo,
#endif
environmentRadiance
);
vec3 environmentIrradiance=vec3(0.,0.,0.);
#ifdef USESPHERICALFROMREFLECTIONMAP
#if defined(NORMAL) && defined(USESPHERICALINVERTEX)
environmentIrradiance=vEnvironmentIrradiance;
#else
#ifdef ANISOTROPIC
vec3 irradianceVector=vec3(reflectionMatrix*vec4(anisotropicOut.anisotropicNormal,0)).xyz;
#else
vec3 irradianceVector=vec3(reflectionMatrix*vec4(normalW,0)).xyz;
#endif
#ifdef REFLECTIONMAP_OPPOSITEZ
irradianceVector.z*=-1.0;
#endif
#ifdef INVERTCUBICMAP
irradianceVector.y*=-1.0;
#endif
#if defined(REALTIME_FILTERING)
environmentIrradiance=irradiance(reflectionSampler,irradianceVector,vReflectionFilteringInfo);
#else
environmentIrradiance=computeEnvironmentIrradiance(irradianceVector);
#endif
#ifdef SS_TRANSLUCENCY
outParams.irradianceVector=irradianceVector;
#endif
#endif
#elif defined(USEIRRADIANCEMAP)
vec4 environmentIrradiance4=sampleReflection(irradianceSampler,reflectionCoords);
environmentIrradiance=environmentIrradiance4.rgb;
#ifdef RGBDREFLECTION
environmentIrradiance.rgb=fromRGBD(environmentIrradiance4);
#endif
#ifdef GAMMAREFLECTION
environmentIrradiance.rgb=toLinearSpace(environmentIrradiance.rgb);
#endif
#endif
environmentIrradiance*=vReflectionColor.rgb;
outParams.environmentRadiance=environmentRadiance;
outParams.environmentIrradiance=environmentIrradiance;
outParams.reflectionCoords=reflectionCoords;
}
#endif
`;
C.IncludesShadersStore[Qo] = Ko;
const Zo = "pbrBlockSheen", jo = `#ifdef SHEEN
struct sheenOutParams
{
float sheenIntensity;
vec3 sheenColor;
float sheenRoughness;
#ifdef SHEEN_LINKWITHALBEDO
vec3 surfaceAlbedo;
#endif
#if defined(ENVIRONMENTBRDF) && defined(SHEEN_ALBEDOSCALING)
float sheenAlbedoScaling;
#endif
#if defined(REFLECTION) && defined(ENVIRONMENTBRDF)
vec3 finalSheenRadianceScaled;
#endif
#if DEBUGMODE>0
vec4 sheenMapData;
vec3 sheenEnvironmentReflectance;
#endif
};
#define pbr_inline
#define inline
void sheenBlock(
in vec4 vSheenColor,
#ifdef SHEEN_ROUGHNESS
in float vSheenRoughness,
#if defined(SHEEN_TEXTURE_ROUGHNESS) && !defined(SHEEN_TEXTURE_ROUGHNESS_IDENTICAL) && !defined(SHEEN_USE_ROUGHNESS_FROM_MAINTEXTURE)
in vec4 sheenMapRoughnessData,
#endif
#endif
in float roughness,
#ifdef SHEEN_TEXTURE
in vec4 sheenMapData,
in float sheenMapLevel,
#endif
in float reflectance,
#ifdef SHEEN_LINKWITHALBEDO
in vec3 baseColor,
in vec3 surfaceAlbedo,
#endif
#ifdef ENVIRONMENTBRDF
in float NdotV,
in vec3 environmentBrdf,
#endif
#if defined(REFLECTION) && defined(ENVIRONMENTBRDF)
in vec2 AARoughnessFactors,
in vec3 vReflectionMicrosurfaceInfos,
in vec2 vReflectionInfos,
in vec3 vReflectionColor,
in vec4 vLightingIntensity,
#ifdef REFLECTIONMAP_3D
in samplerCube reflectionSampler,
in vec3 reflectionCoords,
#else
in sampler2D reflectionSampler,
in vec2 reflectionCoords,
#endif
in float NdotVUnclamped,
#ifndef LODBASEDMICROSFURACE
#ifdef REFLECTIONMAP_3D
in samplerCube reflectionSamplerLow,
in samplerCube reflectionSamplerHigh,
#else
in sampler2D reflectionSamplerLow,
in sampler2D reflectionSamplerHigh,
#endif
#endif
#ifdef REALTIME_FILTERING
in vec2 vReflectionFilteringInfo,
#endif
#if !defined(REFLECTIONMAP_SKYBOX) && defined(RADIANCEOCCLUSION)
in float seo,
#endif
#if !defined(REFLECTIONMAP_SKYBOX) && defined(HORIZONOCCLUSION) && defined(BUMP) && defined(REFLECTIONMAP_3D)
in float eho,
#endif
#endif
out sheenOutParams outParams
)
{
float sheenIntensity=vSheenColor.a;
#ifdef SHEEN_TEXTURE
#if DEBUGMODE>0
outParams.sheenMapData=sheenMapData;
#endif
#endif
#ifdef SHEEN_LINKWITHALBEDO
float sheenFactor=pow5(1.0-sheenIntensity);
vec3 sheenColor=baseColor.rgb*(1.0-sheenFactor);
float sheenRoughness=sheenIntensity;
outParams.surfaceAlbedo=surfaceAlbedo*sheenFactor;
#ifdef SHEEN_TEXTURE
sheenIntensity*=sheenMapData.a;
#endif
#else
vec3 sheenColor=vSheenColor.rgb;
#ifdef SHEEN_TEXTURE
#ifdef SHEEN_GAMMATEXTURE
sheenColor.rgb*=toLinearSpace(sheenMapData.rgb);
#else
sheenColor.rgb*=sheenMapData.rgb;
#endif
sheenColor.rgb*=sheenMapLevel;
#endif
#ifdef SHEEN_ROUGHNESS
float sheenRoughness=vSheenRoughness;
#ifdef SHEEN_USE_ROUGHNESS_FROM_MAINTEXTURE
#if defined(SHEEN_TEXTURE)
sheenRoughness*=sheenMapData.a;
#endif
#elif defined(SHEEN_TEXTURE_ROUGHNESS)
#ifdef SHEEN_TEXTURE_ROUGHNESS_IDENTICAL
sheenRoughness*=sheenMapData.a;
#else
sheenRoughness*=sheenMapRoughnessData.a;
#endif
#endif
#else
float sheenRoughness=roughness;
#ifdef SHEEN_TEXTURE
sheenIntensity*=sheenMapData.a;
#endif
#endif
#if !defined(SHEEN_ALBEDOSCALING)
sheenIntensity*=(1.-reflectance);
#endif
sheenColor*=sheenIntensity;
#endif
#ifdef ENVIRONMENTBRDF
/*#ifdef SHEEN_SOFTER
vec3 environmentSheenBrdf=vec3(0.,0.,getBRDFLookupCharlieSheen(NdotV,sheenRoughness));
#else*/
#ifdef SHEEN_ROUGHNESS
vec3 environmentSheenBrdf=getBRDFLookup(NdotV,sheenRoughness);
#else
vec3 environmentSheenBrdf=environmentBrdf;
#endif
/*#endif*/
#endif
#if defined(REFLECTION) && defined(ENVIRONMENTBRDF)
float sheenAlphaG=convertRoughnessToAverageSlope(sheenRoughness);
#ifdef SPECULARAA
sheenAlphaG+=AARoughnessFactors.y;
#endif
vec4 environmentSheenRadiance=vec4(0.,0.,0.,0.);
sampleReflectionTexture(
sheenAlphaG,
vReflectionMicrosurfaceInfos,
vReflectionInfos,
vReflectionColor,
#if defined(LODINREFLECTIONALPHA) && !defined(REFLECTIONMAP_SKYBOX)
NdotVUnclamped,
#endif
#ifdef LINEARSPECULARREFLECTION
sheenRoughness,
#endif
reflectionSampler,
reflectionCoords,
#ifndef LODBASEDMICROSFURACE
reflectionSamplerLow,
reflectionSamplerHigh,
#endif
#ifdef REALTIME_FILTERING
vReflectionFilteringInfo,
#endif
environmentSheenRadiance
);
vec3 sheenEnvironmentReflectance=getSheenReflectanceFromBRDFLookup(sheenColor,environmentSheenBrdf);
#if !defined(REFLECTIONMAP_SKYBOX) && defined(RADIANCEOCCLUSION)
sheenEnvironmentReflectance*=seo;
#endif
#if !defined(REFLECTIONMAP_SKYBOX) && defined(HORIZONOCCLUSION) && defined(BUMP) && defined(REFLECTIONMAP_3D)
sheenEnvironmentReflectance*=eho;
#endif
#if DEBUGMODE>0
outParams.sheenEnvironmentReflectance=sheenEnvironmentReflectance;
#endif
outParams.finalSheenRadianceScaled=
environmentSheenRadiance.rgb *
sheenEnvironmentReflectance *
vLightingIntensity.z;
#endif
#if defined(ENVIRONMENTBRDF) && defined(SHEEN_ALBEDOSCALING)
outParams.sheenAlbedoScaling=1.0-sheenIntensity*max(max(sheenColor.r,sheenColor.g),sheenColor.b)*environmentSheenBrdf.b;
#endif
outParams.sheenIntensity=sheenIntensity;
outParams.sheenColor=sheenColor;
outParams.sheenRoughness=sheenRoughness;
}
#endif
`;
C.IncludesShadersStore[Zo] = jo;
const qo = "pbrBlockClearcoat", Jo = `struct clearcoatOutParams
{
vec3 specularEnvironmentR0;
float conservationFactor;
vec3 clearCoatNormalW;
vec2 clearCoatAARoughnessFactors;
float clearCoatIntensity;
float clearCoatRoughness;
#ifdef REFLECTION
vec3 finalClearCoatRadianceScaled;
#endif
#ifdef CLEARCOAT_TINT
vec3 absorption;
float clearCoatNdotVRefract;
vec3 clearCoatColor;
float clearCoatThickness;
#endif
#if defined(ENVIRONMENTBRDF) && defined(MS_BRDF_ENERGY_CONSERVATION)
vec3 energyConservationFactorClearCoat;
#endif
#if DEBUGMODE>0
mat3 TBNClearCoat;
vec2 clearCoatMapData;
vec4 clearCoatTintMapData;
vec4 environmentClearCoatRadiance;
float clearCoatNdotV;
vec3 clearCoatEnvironmentReflectance;
#endif
};
#ifdef CLEARCOAT
#define pbr_inline
#define inline
void clearcoatBlock(
in vec3 vPositionW,
in vec3 geometricNormalW,
in vec3 viewDirectionW,
in vec2 vClearCoatParams,
#if defined(CLEARCOAT_TEXTURE_ROUGHNESS) && !defined(CLEARCOAT_TEXTURE_ROUGHNESS_IDENTICAL) && !defined(CLEARCOAT_USE_ROUGHNESS_FROM_MAINTEXTURE)
in vec4 clearCoatMapRoughnessData,
#endif
in vec3 specularEnvironmentR0,
#ifdef CLEARCOAT_TEXTURE
in vec2 clearCoatMapData,
#endif
#ifdef CLEARCOAT_TINT
in vec4 vClearCoatTintParams,
in float clearCoatColorAtDistance,
in vec4 vClearCoatRefractionParams,
#ifdef CLEARCOAT_TINT_TEXTURE
in vec4 clearCoatTintMapData,
#endif
#endif
#ifdef CLEARCOAT_BUMP
in vec2 vClearCoatBumpInfos,
in vec4 clearCoatBumpMapData,
in vec2 vClearCoatBumpUV,
#if defined(TANGENT) && defined(NORMAL)
in mat3 vTBN,
#else
in vec2 vClearCoatTangentSpaceParams,
#endif
#ifdef OBJECTSPACE_NORMALMAP
in mat4 normalMatrix,
#endif
#endif
#if defined(FORCENORMALFORWARD) && defined(NORMAL)
in vec3 faceNormal,
#endif
#ifdef REFLECTION
in vec3 vReflectionMicrosurfaceInfos,
in vec2 vReflectionInfos,
in vec3 vReflectionColor,
in vec4 vLightingIntensity,
#ifdef REFLECTIONMAP_3D
in samplerCube reflectionSampler,
#else
in sampler2D reflectionSampler,
#endif
#ifndef LODBASEDMICROSFURACE
#ifdef REFLECTIONMAP_3D
in samplerCube reflectionSamplerLow,
in samplerCube reflectionSamplerHigh,
#else
in sampler2D reflectionSamplerLow,
in sampler2D reflectionSamplerHigh,
#endif
#endif
#ifdef REALTIME_FILTERING
in vec2 vReflectionFilteringInfo,
#endif
#endif
#if defined(ENVIRONMENTBRDF) && !defined(REFLECTIONMAP_SKYBOX)
#ifdef RADIANCEOCCLUSION
in float ambientMonochrome,
#endif
#endif
#if defined(CLEARCOAT_BUMP) || defined(TWOSIDEDLIGHTING)
in float frontFacingMultiplier,
#endif
out clearcoatOutParams outParams
)
{
float clearCoatIntensity=vClearCoatParams.x;
float clearCoatRoughness=vClearCoatParams.y;
#ifdef CLEARCOAT_TEXTURE
clearCoatIntensity*=clearCoatMapData.x;
#ifdef CLEARCOAT_USE_ROUGHNESS_FROM_MAINTEXTURE
clearCoatRoughness*=clearCoatMapData.y;
#endif
#if DEBUGMODE>0
outParams.clearCoatMapData=clearCoatMapData;
#endif
#endif
#if defined(CLEARCOAT_TEXTURE_ROUGHNESS) && !defined(CLEARCOAT_USE_ROUGHNESS_FROM_MAINTEXTURE)
#ifdef CLEARCOAT_TEXTURE_ROUGHNESS_IDENTICAL
clearCoatRoughness*=clearCoatMapData.y;
#else
clearCoatRoughness*=clearCoatMapRoughnessData.y;
#endif
#endif
outParams.clearCoatIntensity=clearCoatIntensity;
outParams.clearCoatRoughness=clearCoatRoughness;
#ifdef CLEARCOAT_TINT
vec3 clearCoatColor=vClearCoatTintParams.rgb;
float clearCoatThickness=vClearCoatTintParams.a;
#ifdef CLEARCOAT_TINT_TEXTURE
#ifdef CLEARCOAT_TINT_GAMMATEXTURE
clearCoatColor*=toLinearSpace(clearCoatTintMapData.rgb);
#else
clearCoatColor*=clearCoatTintMapData.rgb;
#endif
clearCoatThickness*=clearCoatTintMapData.a;
#if DEBUGMODE>0
outParams.clearCoatTintMapData=clearCoatTintMapData;
#endif
#endif
outParams.clearCoatColor=computeColorAtDistanceInMedia(clearCoatColor,clearCoatColorAtDistance);
outParams.clearCoatThickness=clearCoatThickness;
#endif
#ifdef CLEARCOAT_REMAP_F0
vec3 specularEnvironmentR0Updated=getR0RemappedForClearCoat(specularEnvironmentR0);
#else
vec3 specularEnvironmentR0Updated=specularEnvironmentR0;
#endif
outParams.specularEnvironmentR0=mix(specularEnvironmentR0,specularEnvironmentR0Updated,clearCoatIntensity);
vec3 clearCoatNormalW=geometricNormalW;
#ifdef CLEARCOAT_BUMP
#ifdef NORMALXYSCALE
float clearCoatNormalScale=1.0;
#else
float clearCoatNormalScale=vClearCoatBumpInfos.y;
#endif
#if defined(TANGENT) && defined(NORMAL)
mat3 TBNClearCoat=vTBN;
#else
vec2 TBNClearCoatUV=vClearCoatBumpUV*frontFacingMultiplier;
mat3 TBNClearCoat=cotangent_frame(clearCoatNormalW*clearCoatNormalScale,vPositionW,TBNClearCoatUV,vClearCoatTangentSpaceParams);
#endif
#if DEBUGMODE>0
outParams.TBNClearCoat=TBNClearCoat;
#endif
#ifdef OBJECTSPACE_NORMALMAP
clearCoatNormalW=normalize(clearCoatBumpMapData.xyz *2.0-1.0);
clearCoatNormalW=normalize(mat3(normalMatrix)*clearCoatNormalW);
#else
clearCoatNormalW=perturbNormal(TBNClearCoat,clearCoatBumpMapData.xyz,vClearCoatBumpInfos.y);
#endif
#endif
#if defined(FORCENORMALFORWARD) && defined(NORMAL)
clearCoatNormalW*=sign(dot(clearCoatNormalW,faceNormal));
#endif
#if defined(TWOSIDEDLIGHTING) && defined(NORMAL)
clearCoatNormalW=clearCoatNormalW*frontFacingMultiplier;
#endif
outParams.clearCoatNormalW=clearCoatNormalW;
outParams.clearCoatAARoughnessFactors=getAARoughnessFactors(clearCoatNormalW.xyz);
float clearCoatNdotVUnclamped=dot(clearCoatNormalW,viewDirectionW);
float clearCoatNdotV=absEps(clearCoatNdotVUnclamped);
#if DEBUGMODE>0
outParams.clearCoatNdotV=clearCoatNdotV;
#endif
#ifdef CLEARCOAT_TINT
vec3 clearCoatVRefract=refract(-viewDirectionW,clearCoatNormalW,vClearCoatRefractionParams.y);
outParams.clearCoatNdotVRefract=absEps(dot(clearCoatNormalW,clearCoatVRefract));
#endif
#if defined(ENVIRONMENTBRDF) && (!defined(REFLECTIONMAP_SKYBOX) || defined(MS_BRDF_ENERGY_CONSERVATION))
vec3 environmentClearCoatBrdf=getBRDFLookup(clearCoatNdotV,clearCoatRoughness);
#endif
#if defined(REFLECTION)
float clearCoatAlphaG=convertRoughnessToAverageSlope(clearCoatRoughness);
#ifdef SPECULARAA
clearCoatAlphaG+=outParams.clearCoatAARoughnessFactors.y;
#endif
vec4 environmentClearCoatRadiance=vec4(0.,0.,0.,0.);
vec3 clearCoatReflectionVector=computeReflectionCoords(vec4(vPositionW,1.0),clearCoatNormalW);
#ifdef REFLECTIONMAP_OPPOSITEZ
clearCoatReflectionVector.z*=-1.0;
#endif
#ifdef REFLECTIONMAP_3D
vec3 clearCoatReflectionCoords=clearCoatReflectionVector;
#else
vec2 clearCoatReflectionCoords=clearCoatReflectionVector.xy;
#ifdef REFLECTIONMAP_PROJECTION
clearCoatReflectionCoords/=clearCoatReflectionVector.z;
#endif
clearCoatReflectionCoords.y=1.0-clearCoatReflectionCoords.y;
#endif
sampleReflectionTexture(
clearCoatAlphaG,
vReflectionMicrosurfaceInfos,
vReflectionInfos,
vReflectionColor,
#if defined(LODINREFLECTIONALPHA) && !defined(REFLECTIONMAP_SKYBOX)
clearCoatNdotVUnclamped,
#endif
#ifdef LINEARSPECULARREFLECTION
clearCoatRoughness,
#endif
reflectionSampler,
clearCoatReflectionCoords,
#ifndef LODBASEDMICROSFURACE
reflectionSamplerLow,
reflectionSamplerHigh,
#endif
#ifdef REALTIME_FILTERING
vReflectionFilteringInfo,
#endif
environmentClearCoatRadiance
);
#if DEBUGMODE>0
outParams.environmentClearCoatRadiance=environmentClearCoatRadiance;
#endif
#if defined(ENVIRONMENTBRDF) && !defined(REFLECTIONMAP_SKYBOX)
vec3 clearCoatEnvironmentReflectance=getReflectanceFromBRDFLookup(vec3(vClearCoatRefractionParams.x),environmentClearCoatBrdf);
#ifdef HORIZONOCCLUSION
#ifdef BUMP
#ifdef REFLECTIONMAP_3D
float clearCoatEho=environmentHorizonOcclusion(-viewDirectionW,clearCoatNormalW,geometricNormalW);
clearCoatEnvironmentReflectance*=clearCoatEho;
#endif
#endif
#endif
#else
vec3 clearCoatEnvironmentReflectance=getReflectanceFromAnalyticalBRDFLookup_Jones(clearCoatNdotV,vec3(1.),vec3(1.),sqrt(1.-clearCoatRoughness));
#endif
clearCoatEnvironmentReflectance*=clearCoatIntensity;
#if DEBUGMODE>0
outParams.clearCoatEnvironmentReflectance=clearCoatEnvironmentReflectance;
#endif
outParams.finalClearCoatRadianceScaled=
environmentClearCoatRadiance.rgb *
clearCoatEnvironmentReflectance *
vLightingIntensity.z;
#endif
#if defined(CLEARCOAT_TINT)
outParams.absorption=computeClearCoatAbsorption(outParams.clearCoatNdotVRefract,outParams.clearCoatNdotVRefract,outParams.clearCoatColor,clearCoatThickness,clearCoatIntensity);
#endif
float fresnelIBLClearCoat=fresnelSchlickGGX(clearCoatNdotV,vClearCoatRefractionParams.x,CLEARCOATREFLECTANCE90);
fresnelIBLClearCoat*=clearCoatIntensity;
outParams.conservationFactor=(1.-fresnelIBLClearCoat);
#if defined(ENVIRONMENTBRDF) && defined(MS_BRDF_ENERGY_CONSERVATION)
outParams.energyConservationFactorClearCoat=getEnergyConservationFactor(outParams.specularEnvironmentR0,environmentClearCoatBrdf);
#endif
}
#endif
`;
C.IncludesShadersStore[qo] = Jo;
const $o = "pbrBlockIridescence", el = `struct iridescenceOutParams
{
float iridescenceIntensity;
float iridescenceIOR;
float iridescenceThickness;
vec3 specularEnvironmentR0;
};
#ifdef IRIDESCENCE
#define pbr_inline
#define inline
void iridescenceBlock(
in vec4 vIridescenceParams,
in float viewAngle,
in vec3 specularEnvironmentR0,
#ifdef IRIDESCENCE_TEXTURE
in vec2 iridescenceMapData,
#endif
#ifdef IRIDESCENCE_THICKNESS_TEXTURE
in vec2 iridescenceThicknessMapData,
#endif
#ifdef CLEARCOAT
in float NdotVUnclamped,
#ifdef CLEARCOAT_TEXTURE
in vec2 clearCoatMapData,
#endif
#endif
out iridescenceOutParams outParams
)
{
float iridescenceIntensity=vIridescenceParams.x;
float iridescenceIOR=vIridescenceParams.y;
float iridescenceThicknessMin=vIridescenceParams.z;
float iridescenceThicknessMax=vIridescenceParams.w;
float iridescenceThicknessWeight=1.;
#ifdef IRIDESCENCE_TEXTURE
iridescenceIntensity*=iridescenceMapData.x;
#ifdef IRIDESCENCE_USE_THICKNESS_FROM_MAINTEXTURE
iridescenceThicknessWeight=iridescenceMapData.g;
#endif
#endif
#if defined(IRIDESCENCE_THICKNESS_TEXTURE)
iridescenceThicknessWeight=iridescenceThicknessMapData.g;
#endif
float iridescenceThickness=mix(iridescenceThicknessMin,iridescenceThicknessMax,iridescenceThicknessWeight);
float topIor=1.; 
#ifdef CLEARCOAT
float clearCoatIntensity=vClearCoatParams.x;
#ifdef CLEARCOAT_TEXTURE
clearCoatIntensity*=clearCoatMapData.x;
#endif
topIor=mix(1.0,vClearCoatRefractionParams.w-1.,clearCoatIntensity);
viewAngle=sqrt(1.0+square(1.0/topIor)*(square(NdotVUnclamped)-1.0));
#endif
vec3 iridescenceFresnel=evalIridescence(topIor,iridescenceIOR,viewAngle,iridescenceThickness,specularEnvironmentR0);
outParams.specularEnvironmentR0=mix(specularEnvironmentR0,iridescenceFresnel,iridescenceIntensity);
outParams.iridescenceIntensity=iridescenceIntensity;
outParams.iridescenceThickness=iridescenceThickness;
outParams.iridescenceIOR=iridescenceIOR;
}
#endif
`;
C.IncludesShadersStore[$o] = el;
const tl = "pbrBlockSubSurface", il = `struct subSurfaceOutParams
{
vec3 specularEnvironmentReflectance;
#ifdef SS_REFRACTION
vec3 finalRefraction;
vec3 surfaceAlbedo;
#ifdef SS_LINKREFRACTIONTOTRANSPARENCY
float alpha;
#endif
#ifdef REFLECTION
float refractionFactorForIrradiance;
#endif
#endif
#ifdef SS_TRANSLUCENCY
vec3 transmittance;
float translucencyIntensity;
#ifdef REFLECTION
vec3 refractionIrradiance;
#endif
#endif
#if DEBUGMODE>0
vec4 thicknessMap;
vec4 environmentRefraction;
vec3 refractionTransmittance;
#endif
};
#ifdef SUBSURFACE
#define pbr_inline
#define inline
void subSurfaceBlock(
in vec3 vSubSurfaceIntensity,
in vec2 vThicknessParam,
in vec4 vTintColor,
in vec3 normalW,
in vec3 specularEnvironmentReflectance,
#ifdef SS_THICKNESSANDMASK_TEXTURE
in vec4 thicknessMap,
#endif
#ifdef SS_REFRACTIONINTENSITY_TEXTURE
in vec4 refractionIntensityMap,
#endif
#ifdef SS_TRANSLUCENCYINTENSITY_TEXTURE
in vec4 translucencyIntensityMap,
#endif
#ifdef REFLECTION
#ifdef SS_TRANSLUCENCY
in mat4 reflectionMatrix,
#ifdef USESPHERICALFROMREFLECTIONMAP
#if !defined(NORMAL) || !defined(USESPHERICALINVERTEX)
in vec3 irradianceVector_,
#endif
#if defined(REALTIME_FILTERING)
in samplerCube reflectionSampler,
in vec2 vReflectionFilteringInfo,
#endif
#endif
#ifdef USEIRRADIANCEMAP
#ifdef REFLECTIONMAP_3D
in samplerCube irradianceSampler,
#else
in sampler2D irradianceSampler,
#endif
#endif
#endif
#endif
#if defined(SS_REFRACTION) || defined(SS_TRANSLUCENCY)
in vec3 surfaceAlbedo,
#endif
#ifdef SS_REFRACTION
in vec3 vPositionW,
in vec3 viewDirectionW,
in mat4 view,
in vec4 vRefractionInfos,
in mat4 refractionMatrix,
in vec4 vRefractionMicrosurfaceInfos,
in vec4 vLightingIntensity,
#ifdef SS_LINKREFRACTIONTOTRANSPARENCY
in float alpha,
#endif
#ifdef SS_LODINREFRACTIONALPHA
in float NdotVUnclamped,
#endif
#ifdef SS_LINEARSPECULARREFRACTION
in float roughness,
#endif
in float alphaG,
#ifdef SS_REFRACTIONMAP_3D
in samplerCube refractionSampler,
#ifndef LODBASEDMICROSFURACE
in samplerCube refractionSamplerLow,
in samplerCube refractionSamplerHigh,
#endif
#else
in sampler2D refractionSampler,
#ifndef LODBASEDMICROSFURACE
in sampler2D refractionSamplerLow,
in sampler2D refractionSamplerHigh,
#endif
#endif
#ifdef ANISOTROPIC
in anisotropicOutParams anisotropicOut,
#endif
#ifdef REALTIME_FILTERING
in vec2 vRefractionFilteringInfo,
#endif
#ifdef SS_USE_LOCAL_REFRACTIONMAP_CUBIC
in vec3 refractionPosition,
in vec3 refractionSize,
#endif
#endif
#ifdef SS_TRANSLUCENCY
in vec3 vDiffusionDistance,
#endif
out subSurfaceOutParams outParams
)
{
outParams.specularEnvironmentReflectance=specularEnvironmentReflectance;
#ifdef SS_REFRACTION
float refractionIntensity=vSubSurfaceIntensity.x;
#ifdef SS_LINKREFRACTIONTOTRANSPARENCY
refractionIntensity*=(1.0-alpha);
outParams.alpha=1.0;
#endif
#endif
#ifdef SS_TRANSLUCENCY
float translucencyIntensity=vSubSurfaceIntensity.y;
#endif
#ifdef SS_THICKNESSANDMASK_TEXTURE
#if defined(SS_USE_GLTF_TEXTURES)
float thickness=thicknessMap.g*vThicknessParam.y+vThicknessParam.x;
#else
float thickness=thicknessMap.r*vThicknessParam.y+vThicknessParam.x;
#endif
#if DEBUGMODE>0
outParams.thicknessMap=thicknessMap;
#endif
#ifdef SS_MASK_FROM_THICKNESS_TEXTURE
#if defined(SS_REFRACTION) && defined(SS_REFRACTION_USE_INTENSITY_FROM_TEXTURE)
#if defined(SS_USE_GLTF_TEXTURES)
refractionIntensity*=thicknessMap.r;
#else
refractionIntensity*=thicknessMap.g;
#endif
#endif
#if defined(SS_TRANSLUCENCY) && defined(SS_TRANSLUCENCY_USE_INTENSITY_FROM_TEXTURE)
translucencyIntensity*=thicknessMap.b;
#endif
#endif
#else
float thickness=vThicknessParam.y;
#endif
#ifdef SS_REFRACTIONINTENSITY_TEXTURE
#ifdef SS_USE_GLTF_TEXTURES
refractionIntensity*=refractionIntensityMap.r;
#else
refractionIntensity*=refractionIntensityMap.g;
#endif
#endif
#ifdef SS_TRANSLUCENCYINTENSITY_TEXTURE
translucencyIntensity*=translucencyIntensityMap.b;
#endif
#ifdef SS_TRANSLUCENCY
thickness=maxEps(thickness);
vec3 transmittance=transmittanceBRDF_Burley(vTintColor.rgb,vDiffusionDistance,thickness);
transmittance*=translucencyIntensity;
outParams.transmittance=transmittance;
outParams.translucencyIntensity=translucencyIntensity;
#endif
#ifdef SS_REFRACTION
vec4 environmentRefraction=vec4(0.,0.,0.,0.);
#ifdef ANISOTROPIC
vec3 refractionVector=refract(-viewDirectionW,anisotropicOut.anisotropicNormal,vRefractionInfos.y);
#else
vec3 refractionVector=refract(-viewDirectionW,normalW,vRefractionInfos.y);
#endif
#ifdef SS_REFRACTIONMAP_OPPOSITEZ
refractionVector.z*=-1.0;
#endif
#ifdef SS_REFRACTIONMAP_3D
#ifdef SS_USE_LOCAL_REFRACTIONMAP_CUBIC
refractionVector=parallaxCorrectNormal(vPositionW,refractionVector,refractionSize,refractionPosition);
#endif
refractionVector.y=refractionVector.y*vRefractionInfos.w;
vec3 refractionCoords=refractionVector;
refractionCoords=vec3(refractionMatrix*vec4(refractionCoords,0));
#else
#ifdef SS_USE_THICKNESS_AS_DEPTH
vec3 vRefractionUVW=vec3(refractionMatrix*(view*vec4(vPositionW+refractionVector*thickness,1.0)));
#else
vec3 vRefractionUVW=vec3(refractionMatrix*(view*vec4(vPositionW+refractionVector*vRefractionInfos.z,1.0)));
#endif
vec2 refractionCoords=vRefractionUVW.xy/vRefractionUVW.z;
refractionCoords.y=1.0-refractionCoords.y;
#endif
#ifdef SS_HAS_THICKNESS
float ior=vRefractionInfos.y;
#else
float ior=vRefractionMicrosurfaceInfos.w;
#endif
#ifdef SS_LODINREFRACTIONALPHA
float refractionAlphaG=alphaG;
refractionAlphaG=mix(alphaG,0.0,clamp(ior*3.0-2.0,0.0,1.0));
float refractionLOD=getLodFromAlphaG(vRefractionMicrosurfaceInfos.x,refractionAlphaG,NdotVUnclamped);
#elif defined(SS_LINEARSPECULARREFRACTION)
float refractionRoughness=alphaG;
refractionRoughness=mix(alphaG,0.0,clamp(ior*3.0-2.0,0.0,1.0));
float refractionLOD=getLinearLodFromRoughness(vRefractionMicrosurfaceInfos.x,refractionRoughness);
#else
float refractionAlphaG=alphaG;
refractionAlphaG=mix(alphaG,0.0,clamp(ior*3.0-2.0,0.0,1.0));
float refractionLOD=getLodFromAlphaG(vRefractionMicrosurfaceInfos.x,refractionAlphaG);
#endif
#ifdef LODBASEDMICROSFURACE
refractionLOD=refractionLOD*vRefractionMicrosurfaceInfos.y+vRefractionMicrosurfaceInfos.z;
#ifdef SS_LODINREFRACTIONALPHA
float automaticRefractionLOD=UNPACK_LOD(sampleRefraction(refractionSampler,refractionCoords).a);
float requestedRefractionLOD=max(automaticRefractionLOD,refractionLOD);
#else
float requestedRefractionLOD=refractionLOD;
#endif
#if defined(REALTIME_FILTERING) && defined(SS_REFRACTIONMAP_3D)
environmentRefraction=vec4(radiance(alphaG,refractionSampler,refractionCoords,vRefractionFilteringInfo),1.0);
#else
environmentRefraction=sampleRefractionLod(refractionSampler,refractionCoords,requestedRefractionLOD);
#endif
#else
float lodRefractionNormalized=saturate(refractionLOD/log2(vRefractionMicrosurfaceInfos.x));
float lodRefractionNormalizedDoubled=lodRefractionNormalized*2.0;
vec4 environmentRefractionMid=sampleRefraction(refractionSampler,refractionCoords);
if (lodRefractionNormalizedDoubled<1.0){
environmentRefraction=mix(
sampleRefraction(refractionSamplerHigh,refractionCoords),
environmentRefractionMid,
lodRefractionNormalizedDoubled
);
} else {
environmentRefraction=mix(
environmentRefractionMid,
sampleRefraction(refractionSamplerLow,refractionCoords),
lodRefractionNormalizedDoubled-1.0
);
}
#endif
#ifdef SS_RGBDREFRACTION
environmentRefraction.rgb=fromRGBD(environmentRefraction);
#endif
#ifdef SS_GAMMAREFRACTION
environmentRefraction.rgb=toLinearSpace(environmentRefraction.rgb);
#endif
environmentRefraction.rgb*=vRefractionInfos.x;
#endif
#ifdef SS_REFRACTION
vec3 refractionTransmittance=vec3(refractionIntensity);
#ifdef SS_THICKNESSANDMASK_TEXTURE
vec3 volumeAlbedo=computeColorAtDistanceInMedia(vTintColor.rgb,vTintColor.w);
refractionTransmittance*=cocaLambert(volumeAlbedo,thickness);
#elif defined(SS_LINKREFRACTIONTOTRANSPARENCY)
float maxChannel=max(max(surfaceAlbedo.r,surfaceAlbedo.g),surfaceAlbedo.b);
vec3 volumeAlbedo=saturate(maxChannel*surfaceAlbedo);
environmentRefraction.rgb*=volumeAlbedo;
#else
vec3 volumeAlbedo=computeColorAtDistanceInMedia(vTintColor.rgb,vTintColor.w);
refractionTransmittance*=cocaLambert(volumeAlbedo,vThicknessParam.y);
#endif
#ifdef SS_ALBEDOFORREFRACTIONTINT
environmentRefraction.rgb*=surfaceAlbedo.rgb;
#endif
outParams.surfaceAlbedo=surfaceAlbedo*(1.-refractionIntensity);
#ifdef REFLECTION
outParams.refractionFactorForIrradiance=(1.-refractionIntensity);
#endif
#ifdef UNUSED_MULTIPLEBOUNCES
vec3 bounceSpecularEnvironmentReflectance=(2.0*specularEnvironmentReflectance)/(1.0+specularEnvironmentReflectance);
outParams.specularEnvironmentReflectance=mix(bounceSpecularEnvironmentReflectance,specularEnvironmentReflectance,refractionIntensity);
#endif
refractionTransmittance*=1.0-outParams.specularEnvironmentReflectance;
#if DEBUGMODE>0
outParams.refractionTransmittance=refractionTransmittance;
#endif
outParams.finalRefraction=environmentRefraction.rgb*refractionTransmittance*vLightingIntensity.z;
#if DEBUGMODE>0
outParams.environmentRefraction=environmentRefraction;
#endif
#endif
#if defined(REFLECTION) && defined(SS_TRANSLUCENCY)
#if defined(NORMAL) && defined(USESPHERICALINVERTEX) || !defined(USESPHERICALFROMREFLECTIONMAP)
vec3 irradianceVector=vec3(reflectionMatrix*vec4(normalW,0)).xyz;
#ifdef REFLECTIONMAP_OPPOSITEZ
irradianceVector.z*=-1.0;
#endif
#ifdef INVERTCUBICMAP
irradianceVector.y*=-1.0;
#endif
#else
vec3 irradianceVector=irradianceVector_;
#endif
#if defined(USESPHERICALFROMREFLECTIONMAP)
#if defined(REALTIME_FILTERING)
vec3 refractionIrradiance=irradiance(reflectionSampler,-irradianceVector,vReflectionFilteringInfo);
#else
vec3 refractionIrradiance=computeEnvironmentIrradiance(-irradianceVector);
#endif
#elif defined(USEIRRADIANCEMAP)
#ifdef REFLECTIONMAP_3D
vec3 irradianceCoords=irradianceVector;
#else
vec2 irradianceCoords=irradianceVector.xy;
#ifdef REFLECTIONMAP_PROJECTION
irradianceCoords/=irradianceVector.z;
#endif
irradianceCoords.y=1.0-irradianceCoords.y;
#endif
vec4 refractionIrradiance=sampleReflection(irradianceSampler,-irradianceCoords);
#ifdef RGBDREFLECTION
refractionIrradiance.rgb=fromRGBD(refractionIrradiance);
#endif
#ifdef GAMMAREFLECTION
refractionIrradiance.rgb=toLinearSpace(refractionIrradiance.rgb);
#endif
#else
vec4 refractionIrradiance=vec4(0.);
#endif
refractionIrradiance.rgb*=transmittance;
#ifdef SS_ALBEDOFORTRANSLUCENCYTINT
refractionIrradiance.rgb*=surfaceAlbedo.rgb;
#endif
outParams.refractionIrradiance=refractionIrradiance.rgb;
#endif
}
#endif
`;
C.IncludesShadersStore[tl] = il;
const rl = "pbrBlockNormalGeometric", sl = `vec3 viewDirectionW=normalize(vEyePosition.xyz-vPositionW);
#ifdef NORMAL
vec3 normalW=normalize(vNormalW);
#else
vec3 normalW=normalize(cross(dFdx(vPositionW),dFdy(vPositionW)))*vEyePosition.w;
#endif
vec3 geometricNormalW=normalW;
#if defined(TWOSIDEDLIGHTING) && defined(NORMAL)
geometricNormalW=gl_FrontFacing ? geometricNormalW : -geometricNormalW;
#endif
`;
C.IncludesShadersStore[rl] = sl;
const nl = "pbrBlockNormalFinal", al = `#if defined(FORCENORMALFORWARD) && defined(NORMAL)
vec3 faceNormal=normalize(cross(dFdx(vPositionW),dFdy(vPositionW)))*vEyePosition.w;
#if defined(TWOSIDEDLIGHTING)
faceNormal=gl_FrontFacing ? faceNormal : -faceNormal;
#endif
normalW*=sign(dot(normalW,faceNormal));
#endif
#if defined(TWOSIDEDLIGHTING) && defined(NORMAL)
normalW=gl_FrontFacing ? normalW : -normalW;
#endif
`;
C.IncludesShadersStore[nl] = al;
const ol = "pbrBlockLightmapInit", ll = `#ifdef LIGHTMAP
vec4 lightmapColor=texture2D(lightmapSampler,vLightmapUV+uvOffset);
#ifdef RGBDLIGHTMAP
lightmapColor.rgb=fromRGBD(lightmapColor);
#endif
#ifdef GAMMALIGHTMAP
lightmapColor.rgb=toLinearSpace(lightmapColor.rgb);
#endif
lightmapColor.rgb*=vLightmapInfos.y;
#endif
`;
C.IncludesShadersStore[ol] = ll;
const fl = "pbrBlockGeometryInfo", cl = `float NdotVUnclamped=dot(normalW,viewDirectionW);
float NdotV=absEps(NdotVUnclamped);
float alphaG=convertRoughnessToAverageSlope(roughness);
vec2 AARoughnessFactors=getAARoughnessFactors(normalW.xyz);
#ifdef SPECULARAA
alphaG+=AARoughnessFactors.y;
#endif
#if defined(ENVIRONMENTBRDF)
vec3 environmentBrdf=getBRDFLookup(NdotV,roughness);
#endif
#if defined(ENVIRONMENTBRDF) && !defined(REFLECTIONMAP_SKYBOX)
#ifdef RADIANCEOCCLUSION
#ifdef AMBIENTINGRAYSCALE
float ambientMonochrome=aoOut.ambientOcclusionColor.r;
#else
float ambientMonochrome=getLuminance(aoOut.ambientOcclusionColor);
#endif
float seo=environmentRadianceOcclusion(ambientMonochrome,NdotVUnclamped);
#endif
#ifdef HORIZONOCCLUSION
#ifdef BUMP
#ifdef REFLECTIONMAP_3D
float eho=environmentHorizonOcclusion(-viewDirectionW,normalW,geometricNormalW);
#endif
#endif
#endif
#endif
`;
C.IncludesShadersStore[fl] = cl;
const dl = "pbrBlockReflectance0", hl = `float reflectance=max(max(reflectivityOut.surfaceReflectivityColor.r,reflectivityOut.surfaceReflectivityColor.g),reflectivityOut.surfaceReflectivityColor.b);
vec3 specularEnvironmentR0=reflectivityOut.surfaceReflectivityColor.rgb;
#ifdef METALLICWORKFLOW
vec3 specularEnvironmentR90=vec3(metallicReflectanceFactors.a);
#else 
vec3 specularEnvironmentR90=vec3(1.0,1.0,1.0);
#endif
#ifdef ALPHAFRESNEL
float reflectance90=fresnelGrazingReflectance(reflectance);
specularEnvironmentR90=specularEnvironmentR90*reflectance90;
#endif
`;
C.IncludesShadersStore[dl] = hl;
const ul = "pbrBlockReflectance", El = `#if defined(ENVIRONMENTBRDF) && !defined(REFLECTIONMAP_SKYBOX)
vec3 specularEnvironmentReflectance=getReflectanceFromBRDFLookup(clearcoatOut.specularEnvironmentR0,specularEnvironmentR90,environmentBrdf);
#ifdef RADIANCEOCCLUSION
specularEnvironmentReflectance*=seo;
#endif
#ifdef HORIZONOCCLUSION
#ifdef BUMP
#ifdef REFLECTIONMAP_3D
specularEnvironmentReflectance*=eho;
#endif
#endif
#endif
#else
vec3 specularEnvironmentReflectance=getReflectanceFromAnalyticalBRDFLookup_Jones(NdotV,clearcoatOut.specularEnvironmentR0,specularEnvironmentR90,sqrt(microSurface));
#endif
#ifdef CLEARCOAT
specularEnvironmentReflectance*=clearcoatOut.conservationFactor;
#if defined(CLEARCOAT_TINT)
specularEnvironmentReflectance*=clearcoatOut.absorption;
#endif
#endif
`;
C.IncludesShadersStore[ul] = El;
const _l = "pbrBlockDirectLighting", ml = `vec3 diffuseBase=vec3(0.,0.,0.);
#ifdef SPECULARTERM
vec3 specularBase=vec3(0.,0.,0.);
#endif
#ifdef CLEARCOAT
vec3 clearCoatBase=vec3(0.,0.,0.);
#endif
#ifdef SHEEN
vec3 sheenBase=vec3(0.,0.,0.);
#endif
preLightingInfo preInfo;
lightingInfo info;
float shadow=1.; 
#if defined(CLEARCOAT) && defined(CLEARCOAT_TINT)
vec3 absorption=vec3(0.);
#endif
`;
C.IncludesShadersStore[_l] = ml;
const pl = "pbrBlockFinalLitComponents", Tl = `#if defined(ENVIRONMENTBRDF)
#ifdef MS_BRDF_ENERGY_CONSERVATION
vec3 energyConservationFactor=getEnergyConservationFactor(clearcoatOut.specularEnvironmentR0,environmentBrdf);
#endif
#endif
#ifndef METALLICWORKFLOW
#ifdef SPECULAR_GLOSSINESS_ENERGY_CONSERVATION
surfaceAlbedo.rgb=(1.-reflectance)*surfaceAlbedo.rgb;
#endif
#endif
#if defined(SHEEN) && defined(SHEEN_ALBEDOSCALING) && defined(ENVIRONMENTBRDF)
surfaceAlbedo.rgb=sheenOut.sheenAlbedoScaling*surfaceAlbedo.rgb;
#endif
#ifdef REFLECTION
vec3 finalIrradiance=reflectionOut.environmentIrradiance;
#if defined(CLEARCOAT)
finalIrradiance*=clearcoatOut.conservationFactor;
#if defined(CLEARCOAT_TINT)
finalIrradiance*=clearcoatOut.absorption;
#endif
#endif
#if defined(SS_REFRACTION)
finalIrradiance*=subSurfaceOut.refractionFactorForIrradiance;
#endif
#if defined(SS_TRANSLUCENCY)
finalIrradiance*=(1.0-subSurfaceOut.translucencyIntensity);
finalIrradiance+=subSurfaceOut.refractionIrradiance;
#endif
finalIrradiance*=surfaceAlbedo.rgb;
finalIrradiance*=vLightingIntensity.z;
finalIrradiance*=aoOut.ambientOcclusionColor;
#endif
#ifdef SPECULARTERM
vec3 finalSpecular=specularBase;
finalSpecular=max(finalSpecular,0.0);
vec3 finalSpecularScaled=finalSpecular*vLightingIntensity.x*vLightingIntensity.w;
#if defined(ENVIRONMENTBRDF) && defined(MS_BRDF_ENERGY_CONSERVATION)
finalSpecularScaled*=energyConservationFactor;
#endif
#if defined(SHEEN) && defined(ENVIRONMENTBRDF) && defined(SHEEN_ALBEDOSCALING)
finalSpecularScaled*=sheenOut.sheenAlbedoScaling;
#endif
#endif
#ifdef REFLECTION
vec3 finalRadiance=reflectionOut.environmentRadiance.rgb;
finalRadiance*=subSurfaceOut.specularEnvironmentReflectance;
vec3 finalRadianceScaled=finalRadiance*vLightingIntensity.z;
#if defined(ENVIRONMENTBRDF) && defined(MS_BRDF_ENERGY_CONSERVATION)
finalRadianceScaled*=energyConservationFactor;
#endif
#if defined(SHEEN) && defined(ENVIRONMENTBRDF) && defined(SHEEN_ALBEDOSCALING)
finalRadianceScaled*=sheenOut.sheenAlbedoScaling;
#endif
#endif
#ifdef SHEEN
vec3 finalSheen=sheenBase*sheenOut.sheenColor;
finalSheen=max(finalSheen,0.0);
vec3 finalSheenScaled=finalSheen*vLightingIntensity.x*vLightingIntensity.w;
#if defined(CLEARCOAT) && defined(REFLECTION) && defined(ENVIRONMENTBRDF)
sheenOut.finalSheenRadianceScaled*=clearcoatOut.conservationFactor;
#if defined(CLEARCOAT_TINT)
sheenOut.finalSheenRadianceScaled*=clearcoatOut.absorption;
#endif
#endif
#endif
#ifdef CLEARCOAT
vec3 finalClearCoat=clearCoatBase;
finalClearCoat=max(finalClearCoat,0.0);
vec3 finalClearCoatScaled=finalClearCoat*vLightingIntensity.x*vLightingIntensity.w;
#if defined(ENVIRONMENTBRDF) && defined(MS_BRDF_ENERGY_CONSERVATION)
finalClearCoatScaled*=clearcoatOut.energyConservationFactorClearCoat;
#endif
#ifdef SS_REFRACTION
subSurfaceOut.finalRefraction*=clearcoatOut.conservationFactor;
#ifdef CLEARCOAT_TINT
subSurfaceOut.finalRefraction*=clearcoatOut.absorption;
#endif
#endif
#endif
#ifdef ALPHABLEND
float luminanceOverAlpha=0.0;
#if defined(REFLECTION) && defined(RADIANCEOVERALPHA)
luminanceOverAlpha+=getLuminance(finalRadianceScaled);
#if defined(CLEARCOAT)
luminanceOverAlpha+=getLuminance(clearcoatOut.finalClearCoatRadianceScaled);
#endif
#endif
#if defined(SPECULARTERM) && defined(SPECULAROVERALPHA)
luminanceOverAlpha+=getLuminance(finalSpecularScaled);
#endif
#if defined(CLEARCOAT) && defined(CLEARCOATOVERALPHA)
luminanceOverAlpha+=getLuminance(finalClearCoatScaled);
#endif
#if defined(RADIANCEOVERALPHA) || defined(SPECULAROVERALPHA) || defined(CLEARCOATOVERALPHA)
alpha=saturate(alpha+luminanceOverAlpha*luminanceOverAlpha);
#endif
#endif
`;
C.IncludesShadersStore[pl] = Tl;
const Al = "pbrBlockFinalUnlitComponents", gl = `vec3 finalDiffuse=diffuseBase;
finalDiffuse*=surfaceAlbedo.rgb;
finalDiffuse=max(finalDiffuse,0.0);
finalDiffuse*=vLightingIntensity.x;
vec3 finalAmbient=vAmbientColor;
finalAmbient*=surfaceAlbedo.rgb;
vec3 finalEmissive=vEmissiveColor;
#ifdef EMISSIVE
vec3 emissiveColorTex=texture2D(emissiveSampler,vEmissiveUV+uvOffset).rgb;
#ifdef GAMMAEMISSIVE
finalEmissive*=toLinearSpace(emissiveColorTex.rgb);
#else
finalEmissive*=emissiveColorTex.rgb;
#endif
finalEmissive*= vEmissiveInfos.y;
#endif
finalEmissive*=vLightingIntensity.y;
#ifdef AMBIENT
vec3 ambientOcclusionForDirectDiffuse=mix(vec3(1.),aoOut.ambientOcclusionColor,vAmbientInfos.w);
#else
vec3 ambientOcclusionForDirectDiffuse=aoOut.ambientOcclusionColor;
#endif
finalAmbient*=aoOut.ambientOcclusionColor;
finalDiffuse*=ambientOcclusionForDirectDiffuse;
`;
C.IncludesShadersStore[Al] = gl;
const Sl = "pbrBlockFinalColorComposition", Rl = `vec4 finalColor=vec4(
#ifndef UNLIT
#ifdef REFLECTION
finalIrradiance +
#endif
#ifdef SPECULARTERM
finalSpecularScaled +
#endif
#ifdef SHEEN
finalSheenScaled +
#endif
#ifdef CLEARCOAT
finalClearCoatScaled +
#endif
#ifdef REFLECTION
finalRadianceScaled +
#if defined(SHEEN) && defined(ENVIRONMENTBRDF)
sheenOut.finalSheenRadianceScaled +
#endif
#ifdef CLEARCOAT
clearcoatOut.finalClearCoatRadianceScaled +
#endif
#endif
#ifdef SS_REFRACTION
subSurfaceOut.finalRefraction +
#endif
#endif
finalAmbient +
finalDiffuse,
alpha);
#ifdef LIGHTMAP
#ifndef LIGHTMAPEXCLUDED
#ifdef USELIGHTMAPASSHADOWMAP
finalColor.rgb*=lightmapColor.rgb;
#else
finalColor.rgb+=lightmapColor.rgb;
#endif
#endif
#endif
finalColor.rgb+=finalEmissive;
#define CUSTOM_FRAGMENT_BEFORE_FOG
finalColor=max(finalColor,0.0);
`;
C.IncludesShadersStore[Sl] = Rl;
const Cl = "pbrBlockImageProcessing", vl = `#if defined(IMAGEPROCESSINGPOSTPROCESS) || defined(SS_SCATTERING)
#if !defined(SKIPFINALCOLORCLAMP)
finalColor.rgb=clamp(finalColor.rgb,0.,30.0);
#endif
#else
finalColor=applyImageProcessing(finalColor);
#endif
finalColor.a*=visibility;
#ifdef PREMULTIPLYALPHA
finalColor.rgb*=finalColor.a;
#endif
`;
C.IncludesShadersStore[Cl] = vl;
const Il = "pbrDebug", Ml = `#if DEBUGMODE>0
if (vClipSpacePosition.x/vClipSpacePosition.w>=vDebugMode.x) {
#if DEBUGMODE==1
gl_FragColor.rgb=vPositionW.rgb;
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==2 && defined(NORMAL)
gl_FragColor.rgb=vNormalW.rgb;
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==3 && defined(BUMP) || DEBUGMODE==3 && defined(PARALLAX) || DEBUGMODE==3 && defined(ANISOTROPIC)
gl_FragColor.rgb=TBN[0];
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==4 && defined(BUMP) || DEBUGMODE==4 && defined(PARALLAX) || DEBUGMODE==4 && defined(ANISOTROPIC)
gl_FragColor.rgb=TBN[1];
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==5
gl_FragColor.rgb=normalW;
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==6 && defined(MAINUV1)
gl_FragColor.rgb=vec3(vMainUV1,0.0);
#elif DEBUGMODE==7 && defined(MAINUV2)
gl_FragColor.rgb=vec3(vMainUV2,0.0);
#elif DEBUGMODE==8 && defined(CLEARCOAT) && defined(CLEARCOAT_BUMP)
gl_FragColor.rgb=clearcoatOut.TBNClearCoat[0];
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==9 && defined(CLEARCOAT) && defined(CLEARCOAT_BUMP)
gl_FragColor.rgb=clearcoatOut.TBNClearCoat[1];
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==10 && defined(CLEARCOAT)
gl_FragColor.rgb=clearcoatOut.clearCoatNormalW;
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==11 && defined(ANISOTROPIC)
gl_FragColor.rgb=anisotropicOut.anisotropicNormal;
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==12 && defined(ANISOTROPIC)
gl_FragColor.rgb=anisotropicOut.anisotropicTangent;
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==13 && defined(ANISOTROPIC)
gl_FragColor.rgb=anisotropicOut.anisotropicBitangent;
#define DEBUGMODE_NORMALIZE
#elif DEBUGMODE==20 && defined(ALBEDO)
gl_FragColor.rgb=albedoTexture.rgb;
#elif DEBUGMODE==21 && defined(AMBIENT)
gl_FragColor.rgb=aoOut.ambientOcclusionColorMap.rgb;
#elif DEBUGMODE==22 && defined(OPACITY)
gl_FragColor.rgb=opacityMap.rgb;
#elif DEBUGMODE==23 && defined(EMISSIVE)
gl_FragColor.rgb=emissiveColorTex.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==24 && defined(LIGHTMAP)
gl_FragColor.rgb=lightmapColor.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==25 && defined(REFLECTIVITY) && defined(METALLICWORKFLOW)
gl_FragColor.rgb=reflectivityOut.surfaceMetallicColorMap.rgb;
#elif DEBUGMODE==26 && defined(REFLECTIVITY) && !defined(METALLICWORKFLOW)
gl_FragColor.rgb=reflectivityOut.surfaceReflectivityColorMap.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==27 && defined(CLEARCOAT) && defined(CLEARCOAT_TEXTURE)
gl_FragColor.rgb=vec3(clearcoatOut.clearCoatMapData.rg,0.0);
#elif DEBUGMODE==28 && defined(CLEARCOAT) && defined(CLEARCOAT_TINT) && defined(CLEARCOAT_TINT_TEXTURE)
gl_FragColor.rgb=clearcoatOut.clearCoatTintMapData.rgb;
#elif DEBUGMODE==29 && defined(SHEEN) && defined(SHEEN_TEXTURE)
gl_FragColor.rgb=sheenOut.sheenMapData.rgb;
#elif DEBUGMODE==30 && defined(ANISOTROPIC) && defined(ANISOTROPIC_TEXTURE)
gl_FragColor.rgb=anisotropicOut.anisotropyMapData.rgb;
#elif DEBUGMODE==31 && defined(SUBSURFACE) && defined(SS_THICKNESSANDMASK_TEXTURE)
gl_FragColor.rgb=subSurfaceOut.thicknessMap.rgb;
#elif DEBUGMODE==40 && defined(SS_REFRACTION)
gl_FragColor.rgb=subSurfaceOut.environmentRefraction.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==41 && defined(REFLECTION)
gl_FragColor.rgb=reflectionOut.environmentRadiance.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==42 && defined(CLEARCOAT) && defined(REFLECTION)
gl_FragColor.rgb=clearcoatOut.environmentClearCoatRadiance.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==50
gl_FragColor.rgb=diffuseBase.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==51 && defined(SPECULARTERM)
gl_FragColor.rgb=specularBase.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==52 && defined(CLEARCOAT)
gl_FragColor.rgb=clearCoatBase.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==53 && defined(SHEEN)
gl_FragColor.rgb=sheenBase.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==54 && defined(REFLECTION)
gl_FragColor.rgb=reflectionOut.environmentIrradiance.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==60
gl_FragColor.rgb=surfaceAlbedo.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==61
gl_FragColor.rgb=clearcoatOut.specularEnvironmentR0;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==62 && defined(METALLICWORKFLOW)
gl_FragColor.rgb=vec3(reflectivityOut.metallicRoughness.r);
#elif DEBUGMODE==71 && defined(METALLICWORKFLOW)
gl_FragColor.rgb=reflectivityOut.metallicF0;
#elif DEBUGMODE==63
gl_FragColor.rgb=vec3(roughness);
#elif DEBUGMODE==64
gl_FragColor.rgb=vec3(alphaG);
#elif DEBUGMODE==65
gl_FragColor.rgb=vec3(NdotV);
#elif DEBUGMODE==66 && defined(CLEARCOAT) && defined(CLEARCOAT_TINT)
gl_FragColor.rgb=clearcoatOut.clearCoatColor.rgb;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==67 && defined(CLEARCOAT)
gl_FragColor.rgb=vec3(clearcoatOut.clearCoatRoughness);
#elif DEBUGMODE==68 && defined(CLEARCOAT)
gl_FragColor.rgb=vec3(clearcoatOut.clearCoatNdotV);
#elif DEBUGMODE==69 && defined(SUBSURFACE) && defined(SS_TRANSLUCENCY)
gl_FragColor.rgb=subSurfaceOut.transmittance;
#elif DEBUGMODE==70 && defined(SUBSURFACE) && defined(SS_REFRACTION)
gl_FragColor.rgb=subSurfaceOut.refractionTransmittance;
#elif DEBUGMODE==80 && defined(RADIANCEOCCLUSION)
gl_FragColor.rgb=vec3(seo);
#elif DEBUGMODE==81 && defined(HORIZONOCCLUSION)
gl_FragColor.rgb=vec3(eho);
#elif DEBUGMODE==82 && defined(MS_BRDF_ENERGY_CONSERVATION)
gl_FragColor.rgb=vec3(energyConservationFactor);
#elif DEBUGMODE==83 && defined(ENVIRONMENTBRDF) && !defined(REFLECTIONMAP_SKYBOX)
gl_FragColor.rgb=specularEnvironmentReflectance;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==84 && defined(CLEARCOAT) && defined(ENVIRONMENTBRDF) && !defined(REFLECTIONMAP_SKYBOX)
gl_FragColor.rgb=clearcoatOut.clearCoatEnvironmentReflectance;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==85 && defined(SHEEN) && defined(REFLECTION)
gl_FragColor.rgb=sheenOut.sheenEnvironmentReflectance;
#define DEBUGMODE_GAMMA
#elif DEBUGMODE==86 && defined(ALPHABLEND)
gl_FragColor.rgb=vec3(luminanceOverAlpha);
#elif DEBUGMODE==87
gl_FragColor.rgb=vec3(alpha);
#endif
gl_FragColor.rgb*=vDebugMode.y;
#ifdef DEBUGMODE_NORMALIZE
gl_FragColor.rgb=normalize(gl_FragColor.rgb)*0.5+0.5;
#endif
#ifdef DEBUGMODE_GAMMA
gl_FragColor.rgb=toGammaSpace(gl_FragColor.rgb);
#endif
gl_FragColor.a=1.0;
#ifdef PREPASS
gl_FragData[0]=toLinearSpace(gl_FragColor); 
gl_FragData[1]=vec4(0.,0.,0.,0.); 
#endif
return;
}
#endif
`;
C.IncludesShadersStore[Il] = Ml;
const xl = "pbrPixelShader", Nl = `#if defined(BUMP) || !defined(NORMAL) || defined(FORCENORMALFORWARD) || defined(SPECULARAA) || defined(CLEARCOAT_BUMP) || defined(ANISOTROPIC)
#extension GL_OES_standard_derivatives : enable
#endif
#ifdef LODBASEDMICROSFURACE
#extension GL_EXT_shader_texture_lod : enable
#endif
#define CUSTOM_FRAGMENT_BEGIN
#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif
#include<prePassDeclaration>[SCENE_MRT_COUNT]
precision highp float;
#include<oitDeclaration>
#ifndef FROMLINEARSPACE
#define FROMLINEARSPACE
#endif
#include<__decl__pbrFragment>
#include<pbrFragmentExtraDeclaration>
#include<__decl__lightFragment>[0..maxSimultaneousLights]
#include<pbrFragmentSamplersDeclaration>
#include<imageProcessingDeclaration>
#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
#include<helperFunctions>
#include<subSurfaceScatteringFunctions>
#include<importanceSampling>
#include<pbrHelperFunctions>
#include<imageProcessingFunctions>
#include<shadowsFragmentFunctions>
#include<harmonicsFunctions>
#include<pbrDirectLightingSetupFunctions>
#include<pbrDirectLightingFalloffFunctions>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
#include<pbrDirectLightingFunctions>
#include<pbrIBLFunctions>
#include<bumpFragmentMainFunctions>
#include<bumpFragmentFunctions>
#ifdef REFLECTION
#include<reflectionFunction>
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
#include<pbrBlockAlbedoOpacity>
#include<pbrBlockReflectivity>
#include<pbrBlockAmbientOcclusion>
#include<pbrBlockAlphaFresnel>
#include<pbrBlockAnisotropic>
#include<pbrBlockReflection>
#include<pbrBlockSheen>
#include<pbrBlockClearcoat>
#include<pbrBlockIridescence>
#include<pbrBlockSubSurface>
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
#include<pbrBlockNormalGeometric>
#include<bumpFragment>
#include<pbrBlockNormalFinal>
albedoOpacityOutParams albedoOpacityOut;
#ifdef ALBEDO
vec4 albedoTexture=texture2D(albedoSampler,vAlbedoUV+uvOffset);
#endif
#ifdef OPACITY
vec4 opacityMap=texture2D(opacitySampler,vOpacityUV+uvOffset);
#endif
#ifdef DECAL
vec4 decalColor=texture2D(decalSampler,vDecalUV+uvOffset);
#endif
albedoOpacityBlock(
vAlbedoColor,
#ifdef ALBEDO
albedoTexture,
vAlbedoInfos,
#endif
#ifdef OPACITY
opacityMap,
vOpacityInfos,
#endif
#ifdef DETAIL
detailColor,
vDetailInfos,
#endif
#ifdef DECAL
decalColor,
vDecalInfos,
#endif
albedoOpacityOut
);
vec3 surfaceAlbedo=albedoOpacityOut.surfaceAlbedo;
float alpha=albedoOpacityOut.alpha;
#define CUSTOM_FRAGMENT_UPDATE_ALPHA
#include<depthPrePass>
#define CUSTOM_FRAGMENT_BEFORE_LIGHTS
ambientOcclusionOutParams aoOut;
#ifdef AMBIENT
vec3 ambientOcclusionColorMap=texture2D(ambientSampler,vAmbientUV+uvOffset).rgb;
#endif
ambientOcclusionBlock(
#ifdef AMBIENT
ambientOcclusionColorMap,
vAmbientInfos,
#endif
aoOut
);
#include<pbrBlockLightmapInit>
#ifdef UNLIT
vec3 diffuseBase=vec3(1.,1.,1.);
#else
vec3 baseColor=surfaceAlbedo;
reflectivityOutParams reflectivityOut;
#if defined(REFLECTIVITY)
vec4 surfaceMetallicOrReflectivityColorMap=texture2D(reflectivitySampler,vReflectivityUV+uvOffset);
vec4 baseReflectivity=surfaceMetallicOrReflectivityColorMap;
#ifndef METALLICWORKFLOW
#ifdef REFLECTIVITY_GAMMA
surfaceMetallicOrReflectivityColorMap=toLinearSpace(surfaceMetallicOrReflectivityColorMap);
#endif
surfaceMetallicOrReflectivityColorMap.rgb*=vReflectivityInfos.y;
#endif
#endif
#if defined(MICROSURFACEMAP)
vec4 microSurfaceTexel=texture2D(microSurfaceSampler,vMicroSurfaceSamplerUV+uvOffset)*vMicroSurfaceSamplerInfos.y;
#endif
#ifdef METALLICWORKFLOW
vec4 metallicReflectanceFactors=vMetallicReflectanceFactors;
#ifdef REFLECTANCE
vec4 reflectanceFactorsMap=texture2D(reflectanceSampler,vReflectanceUV+uvOffset);
#ifdef REFLECTANCE_GAMMA
reflectanceFactorsMap=toLinearSpace(reflectanceFactorsMap);
#endif
metallicReflectanceFactors.rgb*=reflectanceFactorsMap.rgb;
#endif
#ifdef METALLIC_REFLECTANCE
vec4 metallicReflectanceFactorsMap=texture2D(metallicReflectanceSampler,vMetallicReflectanceUV+uvOffset);
#ifdef METALLIC_REFLECTANCE_GAMMA
metallicReflectanceFactorsMap=toLinearSpace(metallicReflectanceFactorsMap);
#endif
#ifndef METALLIC_REFLECTANCE_USE_ALPHA_ONLY
metallicReflectanceFactors.rgb*=metallicReflectanceFactorsMap.rgb;
#endif
metallicReflectanceFactors*=metallicReflectanceFactorsMap.a;
#endif
#endif
reflectivityBlock(
vReflectivityColor,
#ifdef METALLICWORKFLOW
surfaceAlbedo,
metallicReflectanceFactors,
#endif
#ifdef REFLECTIVITY
vReflectivityInfos,
surfaceMetallicOrReflectivityColorMap,
#endif
#if defined(METALLICWORKFLOW) && defined(REFLECTIVITY) && defined(AOSTOREINMETALMAPRED)
aoOut.ambientOcclusionColor,
#endif
#ifdef MICROSURFACEMAP
microSurfaceTexel,
#endif
#ifdef DETAIL
detailColor,
vDetailInfos,
#endif
reflectivityOut
);
float microSurface=reflectivityOut.microSurface;
float roughness=reflectivityOut.roughness;
#ifdef METALLICWORKFLOW
surfaceAlbedo=reflectivityOut.surfaceAlbedo;
#endif
#if defined(METALLICWORKFLOW) && defined(REFLECTIVITY) && defined(AOSTOREINMETALMAPRED)
aoOut.ambientOcclusionColor=reflectivityOut.ambientOcclusionColor;
#endif
#ifdef ALPHAFRESNEL
#if defined(ALPHATEST) || defined(ALPHABLEND)
alphaFresnelOutParams alphaFresnelOut;
alphaFresnelBlock(
normalW,
viewDirectionW,
alpha,
microSurface,
alphaFresnelOut
);
alpha=alphaFresnelOut.alpha;
#endif
#endif
#include<pbrBlockGeometryInfo>
#ifdef ANISOTROPIC
anisotropicOutParams anisotropicOut;
#ifdef ANISOTROPIC_TEXTURE
vec3 anisotropyMapData=texture2D(anisotropySampler,vAnisotropyUV+uvOffset).rgb*vAnisotropyInfos.y;
#endif
anisotropicBlock(
vAnisotropy,
#ifdef ANISOTROPIC_TEXTURE
anisotropyMapData,
#endif
TBN,
normalW,
viewDirectionW,
anisotropicOut
);
#endif
#ifdef REFLECTION
reflectionOutParams reflectionOut;
#ifndef USE_CUSTOM_REFLECTION
reflectionBlock(
vPositionW,
normalW,
alphaG,
vReflectionMicrosurfaceInfos,
vReflectionInfos,
vReflectionColor,
#ifdef ANISOTROPIC
anisotropicOut,
#endif
#if defined(LODINREFLECTIONALPHA) && !defined(REFLECTIONMAP_SKYBOX)
NdotVUnclamped,
#endif
#ifdef LINEARSPECULARREFLECTION
roughness,
#endif
reflectionSampler,
#if defined(NORMAL) && defined(USESPHERICALINVERTEX)
vEnvironmentIrradiance,
#endif
#ifdef USESPHERICALFROMREFLECTIONMAP
#if !defined(NORMAL) || !defined(USESPHERICALINVERTEX)
reflectionMatrix,
#endif
#endif
#ifdef USEIRRADIANCEMAP
irradianceSampler,
#endif
#ifndef LODBASEDMICROSFURACE
reflectionSamplerLow,
reflectionSamplerHigh,
#endif
#ifdef REALTIME_FILTERING
vReflectionFilteringInfo,
#endif
reflectionOut
);
#else
#define CUSTOM_REFLECTION
#endif
#endif
#include<pbrBlockReflectance0>
#ifdef SHEEN
sheenOutParams sheenOut;
#ifdef SHEEN_TEXTURE
vec4 sheenMapData=texture2D(sheenSampler,vSheenUV+uvOffset);
#endif
#if defined(SHEEN_ROUGHNESS) && defined(SHEEN_TEXTURE_ROUGHNESS) && !defined(SHEEN_TEXTURE_ROUGHNESS_IDENTICAL) && !defined(SHEEN_USE_ROUGHNESS_FROM_MAINTEXTURE)
vec4 sheenMapRoughnessData=texture2D(sheenRoughnessSampler,vSheenRoughnessUV+uvOffset)*vSheenInfos.w;
#endif
sheenBlock(
vSheenColor,
#ifdef SHEEN_ROUGHNESS
vSheenRoughness,
#if defined(SHEEN_TEXTURE_ROUGHNESS) && !defined(SHEEN_TEXTURE_ROUGHNESS_IDENTICAL) && !defined(SHEEN_USE_ROUGHNESS_FROM_MAINTEXTURE)
sheenMapRoughnessData,
#endif
#endif
roughness,
#ifdef SHEEN_TEXTURE
sheenMapData,
vSheenInfos.y,
#endif
reflectance,
#ifdef SHEEN_LINKWITHALBEDO
baseColor,
surfaceAlbedo,
#endif
#ifdef ENVIRONMENTBRDF
NdotV,
environmentBrdf,
#endif
#if defined(REFLECTION) && defined(ENVIRONMENTBRDF)
AARoughnessFactors,
vReflectionMicrosurfaceInfos,
vReflectionInfos,
vReflectionColor,
vLightingIntensity,
reflectionSampler,
reflectionOut.reflectionCoords,
NdotVUnclamped,
#ifndef LODBASEDMICROSFURACE
reflectionSamplerLow,
reflectionSamplerHigh,
#endif
#ifdef REALTIME_FILTERING
vReflectionFilteringInfo,
#endif
#if !defined(REFLECTIONMAP_SKYBOX) && defined(RADIANCEOCCLUSION)
seo,
#endif
#if !defined(REFLECTIONMAP_SKYBOX) && defined(HORIZONOCCLUSION) && defined(BUMP) && defined(REFLECTIONMAP_3D)
eho,
#endif
#endif
sheenOut
);
#ifdef SHEEN_LINKWITHALBEDO
surfaceAlbedo=sheenOut.surfaceAlbedo;
#endif
#endif
#ifdef CLEARCOAT
#ifdef CLEARCOAT_TEXTURE
vec2 clearCoatMapData=texture2D(clearCoatSampler,vClearCoatUV+uvOffset).rg*vClearCoatInfos.y;
#endif
#endif
#ifdef IRIDESCENCE
iridescenceOutParams iridescenceOut;
#ifdef IRIDESCENCE_TEXTURE
vec2 iridescenceMapData=texture2D(iridescenceSampler,vIridescenceUV+uvOffset).rg*vIridescenceInfos.y;
#endif
#ifdef IRIDESCENCE_THICKNESS_TEXTURE
vec2 iridescenceThicknessMapData=texture2D(iridescenceThicknessSampler,vIridescenceThicknessUV+uvOffset).rg*vIridescenceInfos.w;
#endif
iridescenceBlock(
vIridescenceParams,
NdotV,
specularEnvironmentR0,
#ifdef IRIDESCENCE_TEXTURE
iridescenceMapData,
#endif
#ifdef IRIDESCENCE_THICKNESS_TEXTURE
iridescenceThicknessMapData,
#endif
#ifdef CLEARCOAT
NdotVUnclamped,
#ifdef CLEARCOAT_TEXTURE
clearCoatMapData,
#endif
#endif
iridescenceOut
);
float iridescenceIntensity=iridescenceOut.iridescenceIntensity;
specularEnvironmentR0=iridescenceOut.specularEnvironmentR0;
#endif
clearcoatOutParams clearcoatOut;
#ifdef CLEARCOAT
#if defined(CLEARCOAT_TEXTURE_ROUGHNESS) && !defined(CLEARCOAT_TEXTURE_ROUGHNESS_IDENTICAL) && !defined(CLEARCOAT_USE_ROUGHNESS_FROM_MAINTEXTURE)
vec4 clearCoatMapRoughnessData=texture2D(clearCoatRoughnessSampler,vClearCoatRoughnessUV+uvOffset)*vClearCoatInfos.w;
#endif
#if defined(CLEARCOAT_TINT) && defined(CLEARCOAT_TINT_TEXTURE)
vec4 clearCoatTintMapData=texture2D(clearCoatTintSampler,vClearCoatTintUV+uvOffset);
#endif
#ifdef CLEARCOAT_BUMP
vec4 clearCoatBumpMapData=texture2D(clearCoatBumpSampler,vClearCoatBumpUV+uvOffset);
#endif
clearcoatBlock(
vPositionW,
geometricNormalW,
viewDirectionW,
vClearCoatParams,
#if defined(CLEARCOAT_TEXTURE_ROUGHNESS) && !defined(CLEARCOAT_TEXTURE_ROUGHNESS_IDENTICAL) && !defined(CLEARCOAT_USE_ROUGHNESS_FROM_MAINTEXTURE)
clearCoatMapRoughnessData,
#endif
specularEnvironmentR0,
#ifdef CLEARCOAT_TEXTURE
clearCoatMapData,
#endif
#ifdef CLEARCOAT_TINT
vClearCoatTintParams,
clearCoatColorAtDistance,
vClearCoatRefractionParams,
#ifdef CLEARCOAT_TINT_TEXTURE
clearCoatTintMapData,
#endif
#endif
#ifdef CLEARCOAT_BUMP
vClearCoatBumpInfos,
clearCoatBumpMapData,
vClearCoatBumpUV,
#if defined(TANGENT) && defined(NORMAL)
vTBN,
#else
vClearCoatTangentSpaceParams,
#endif
#ifdef OBJECTSPACE_NORMALMAP
normalMatrix,
#endif
#endif
#if defined(FORCENORMALFORWARD) && defined(NORMAL)
faceNormal,
#endif
#ifdef REFLECTION
vReflectionMicrosurfaceInfos,
vReflectionInfos,
vReflectionColor,
vLightingIntensity,
reflectionSampler,
#ifndef LODBASEDMICROSFURACE
reflectionSamplerLow,
reflectionSamplerHigh,
#endif
#ifdef REALTIME_FILTERING
vReflectionFilteringInfo,
#endif
#endif
#if defined(ENVIRONMENTBRDF) && !defined(REFLECTIONMAP_SKYBOX)
#ifdef RADIANCEOCCLUSION
ambientMonochrome,
#endif
#endif
#if defined(CLEARCOAT_BUMP) || defined(TWOSIDEDLIGHTING)
(gl_FrontFacing ? 1. : -1.),
#endif
clearcoatOut
);
#else
clearcoatOut.specularEnvironmentR0=specularEnvironmentR0;
#endif
#include<pbrBlockReflectance>
subSurfaceOutParams subSurfaceOut;
#ifdef SUBSURFACE
#ifdef SS_THICKNESSANDMASK_TEXTURE
vec4 thicknessMap=texture2D(thicknessSampler,vThicknessUV+uvOffset);
#endif
#ifdef SS_REFRACTIONINTENSITY_TEXTURE
vec4 refractionIntensityMap=texture2D(refractionIntensitySampler,vRefractionIntensityUV+uvOffset);
#endif
#ifdef SS_TRANSLUCENCYINTENSITY_TEXTURE
vec4 translucencyIntensityMap=texture2D(translucencyIntensitySampler,vTranslucencyIntensityUV+uvOffset);
#endif
subSurfaceBlock(
vSubSurfaceIntensity,
vThicknessParam,
vTintColor,
normalW,
specularEnvironmentReflectance,
#ifdef SS_THICKNESSANDMASK_TEXTURE
thicknessMap,
#endif
#ifdef SS_REFRACTIONINTENSITY_TEXTURE
refractionIntensityMap,
#endif
#ifdef SS_TRANSLUCENCYINTENSITY_TEXTURE
translucencyIntensityMap,
#endif
#ifdef REFLECTION
#ifdef SS_TRANSLUCENCY
reflectionMatrix,
#ifdef USESPHERICALFROMREFLECTIONMAP
#if !defined(NORMAL) || !defined(USESPHERICALINVERTEX)
reflectionOut.irradianceVector,
#endif
#if defined(REALTIME_FILTERING)
reflectionSampler,
vReflectionFilteringInfo,
#endif
#endif
#ifdef USEIRRADIANCEMAP
irradianceSampler,
#endif
#endif
#endif
#if defined(SS_REFRACTION) || defined(SS_TRANSLUCENCY)
surfaceAlbedo,
#endif
#ifdef SS_REFRACTION
vPositionW,
viewDirectionW,
view,
vRefractionInfos,
refractionMatrix,
vRefractionMicrosurfaceInfos,
vLightingIntensity,
#ifdef SS_LINKREFRACTIONTOTRANSPARENCY
alpha,
#endif
#ifdef SS_LODINREFRACTIONALPHA
NdotVUnclamped,
#endif
#ifdef SS_LINEARSPECULARREFRACTION
roughness,
#endif
alphaG,
refractionSampler,
#ifndef LODBASEDMICROSFURACE
refractionSamplerLow,
refractionSamplerHigh,
#endif
#ifdef ANISOTROPIC
anisotropicOut,
#endif
#ifdef REALTIME_FILTERING
vRefractionFilteringInfo,
#endif
#ifdef SS_USE_LOCAL_REFRACTIONMAP_CUBIC
vRefractionPosition,
vRefractionSize,
#endif
#endif
#ifdef SS_TRANSLUCENCY
vDiffusionDistance,
#endif
subSurfaceOut
);
#ifdef SS_REFRACTION
surfaceAlbedo=subSurfaceOut.surfaceAlbedo;
#ifdef SS_LINKREFRACTIONTOTRANSPARENCY
alpha=subSurfaceOut.alpha;
#endif
#endif
#else
subSurfaceOut.specularEnvironmentReflectance=specularEnvironmentReflectance;
#endif
#include<pbrBlockDirectLighting>
#include<lightFragment>[0..maxSimultaneousLights]
#include<pbrBlockFinalLitComponents>
#endif 
#include<pbrBlockFinalUnlitComponents>
#define CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION
#include<pbrBlockFinalColorComposition>
#include<logDepthFragment>
#include<fogFragment>(color,finalColor)
#include<pbrBlockImageProcessing>
#define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR
#ifdef PREPASS
float writeGeometryInfo=finalColor.a>0.4 ? 1.0 : 0.0;
#ifdef PREPASS_POSITION
gl_FragData[PREPASS_POSITION_INDEX]=vec4(vPositionW,writeGeometryInfo);
#endif
#ifdef PREPASS_VELOCITY
vec2 a=(vCurrentPosition.xy/vCurrentPosition.w)*0.5+0.5;
vec2 b=(vPreviousPosition.xy/vPreviousPosition.w)*0.5+0.5;
vec2 velocity=abs(a-b);
velocity=vec2(pow(velocity.x,1.0/3.0),pow(velocity.y,1.0/3.0))*sign(a-b)*0.5+0.5;
gl_FragData[PREPASS_VELOCITY_INDEX]=vec4(velocity,0.0,writeGeometryInfo);
#endif
#ifdef PREPASS_ALBEDO_SQRT
vec3 sqAlbedo=sqrt(surfaceAlbedo); 
#endif
#ifdef PREPASS_IRRADIANCE
vec3 irradiance=finalDiffuse;
#ifndef UNLIT
#ifdef REFLECTION
irradiance+=finalIrradiance;
#endif
#endif
#ifdef SS_SCATTERING
gl_FragData[0]=vec4(finalColor.rgb-irradiance,finalColor.a); 
irradiance/=sqAlbedo;
#else
gl_FragData[0]=finalColor; 
float scatteringDiffusionProfile=255.;
#endif
gl_FragData[PREPASS_IRRADIANCE_INDEX]=vec4(clamp(irradiance,vec3(0.),vec3(1.)),writeGeometryInfo*scatteringDiffusionProfile/255.); 
#else
gl_FragData[0]=vec4(finalColor.rgb,finalColor.a);
#endif
#ifdef PREPASS_DEPTH
gl_FragData[PREPASS_DEPTH_INDEX]=vec4(vViewPos.z,0.0,0.0,writeGeometryInfo); 
#endif
#ifdef PREPASS_NORMAL
gl_FragData[PREPASS_NORMAL_INDEX]=vec4(normalize((view*vec4(normalW,0.0)).rgb),writeGeometryInfo); 
#endif
#ifdef PREPASS_ALBEDO_SQRT
gl_FragData[PREPASS_ALBEDO_SQRT_INDEX]=vec4(sqAlbedo,writeGeometryInfo); 
#endif
#ifdef PREPASS_REFLECTIVITY
#ifndef UNLIT
gl_FragData[PREPASS_REFLECTIVITY_INDEX]=vec4(specularEnvironmentR0,microSurface)*writeGeometryInfo;
#else
gl_FragData[PREPASS_REFLECTIVITY_INDEX]=vec4( 0.0,0.0,0.0,1.0 )*writeGeometryInfo;
#endif
#endif
#endif
#if !defined(PREPASS) || defined(WEBGL2)
gl_FragColor=finalColor;
#endif
#include<oitFragment>
#if ORDER_INDEPENDENT_TRANSPARENCY
if (fragDepth==nearestDepth) {
frontColor.rgb+=finalColor.rgb*finalColor.a*alphaMultiplier;
frontColor.a=1.0-alphaMultiplier*(1.0-finalColor.a);
} else {
backColor+=finalColor;
}
#endif
#include<pbrDebug>
#define CUSTOM_FRAGMENT_MAIN_END
}
`;
C.ShadersStore[xl] = Nl;
const Ol = "pbrVertexDeclaration", Ll = `uniform mat4 view;
uniform mat4 viewProjection;
#ifdef ALBEDO
uniform mat4 albedoMatrix;
uniform vec2 vAlbedoInfos;
#endif
#ifdef AMBIENT
uniform mat4 ambientMatrix;
uniform vec4 vAmbientInfos;
#endif
#ifdef OPACITY
uniform mat4 opacityMatrix;
uniform vec2 vOpacityInfos;
#endif
#ifdef EMISSIVE
uniform vec2 vEmissiveInfos;
uniform mat4 emissiveMatrix;
#endif
#ifdef LIGHTMAP
uniform vec2 vLightmapInfos;
uniform mat4 lightmapMatrix;
#endif
#ifdef REFLECTIVITY 
uniform vec3 vReflectivityInfos;
uniform mat4 reflectivityMatrix;
#endif
#ifdef METALLIC_REFLECTANCE
uniform vec2 vMetallicReflectanceInfos;
uniform mat4 metallicReflectanceMatrix;
#endif
#ifdef REFLECTANCE
uniform vec2 vReflectanceInfos;
uniform mat4 reflectanceMatrix;
#endif
#ifdef MICROSURFACEMAP
uniform vec2 vMicroSurfaceSamplerInfos;
uniform mat4 microSurfaceSamplerMatrix;
#endif
#ifdef BUMP
uniform vec3 vBumpInfos;
uniform mat4 bumpMatrix;
#endif
#ifdef POINTSIZE
uniform float pointSize;
#endif
#ifdef REFLECTION
uniform vec2 vReflectionInfos;
uniform mat4 reflectionMatrix;
#endif
#ifdef CLEARCOAT
#if defined(CLEARCOAT_TEXTURE) || defined(CLEARCOAT_TEXTURE_ROUGHNESS)
uniform vec4 vClearCoatInfos;
#endif
#ifdef CLEARCOAT_TEXTURE
uniform mat4 clearCoatMatrix;
#endif
#ifdef CLEARCOAT_TEXTURE_ROUGHNESS
uniform mat4 clearCoatRoughnessMatrix;
#endif
#ifdef CLEARCOAT_BUMP
uniform vec2 vClearCoatBumpInfos;
uniform mat4 clearCoatBumpMatrix;
#endif
#ifdef CLEARCOAT_TINT_TEXTURE
uniform vec2 vClearCoatTintInfos;
uniform mat4 clearCoatTintMatrix;
#endif
#endif
#ifdef IRIDESCENCE
#if defined(IRIDESCENCE_TEXTURE) || defined(IRIDESCENCE_THICKNESS_TEXTURE)
uniform vec4 vIridescenceInfos;
#endif
#ifdef IRIDESCENCE_TEXTURE
uniform mat4 iridescenceMatrix;
#endif
#ifdef IRIDESCENCE_THICKNESS_TEXTURE
uniform mat4 iridescenceThicknessMatrix;
#endif
#endif
#ifdef ANISOTROPIC
#ifdef ANISOTROPIC_TEXTURE
uniform vec2 vAnisotropyInfos;
uniform mat4 anisotropyMatrix;
#endif
#endif
#ifdef SHEEN
#if defined(SHEEN_TEXTURE) || defined(SHEEN_TEXTURE_ROUGHNESS)
uniform vec4 vSheenInfos;
#endif
#ifdef SHEEN_TEXTURE
uniform mat4 sheenMatrix;
#endif
#ifdef SHEEN_TEXTURE_ROUGHNESS
uniform mat4 sheenRoughnessMatrix;
#endif
#endif
#ifdef SUBSURFACE
#ifdef SS_REFRACTION
uniform vec4 vRefractionInfos;
uniform mat4 refractionMatrix;
#endif
#ifdef SS_THICKNESSANDMASK_TEXTURE
uniform vec2 vThicknessInfos;
uniform mat4 thicknessMatrix;
#endif
#ifdef SS_REFRACTIONINTENSITY_TEXTURE
uniform vec2 vRefractionIntensityInfos;
uniform mat4 refractionIntensityMatrix;
#endif
#ifdef SS_TRANSLUCENCYINTENSITY_TEXTURE
uniform vec2 vTranslucencyIntensityInfos;
uniform mat4 translucencyIntensityMatrix;
#endif
#endif
#ifdef NORMAL
#if defined(USESPHERICALFROMREFLECTIONMAP) && defined(USESPHERICALINVERTEX)
#ifdef USESPHERICALFROMREFLECTIONMAP
#ifdef SPHERICAL_HARMONICS
uniform vec3 vSphericalL00;
uniform vec3 vSphericalL1_1;
uniform vec3 vSphericalL10;
uniform vec3 vSphericalL11;
uniform vec3 vSphericalL2_2;
uniform vec3 vSphericalL2_1;
uniform vec3 vSphericalL20;
uniform vec3 vSphericalL21;
uniform vec3 vSphericalL22;
#else
uniform vec3 vSphericalX;
uniform vec3 vSphericalY;
uniform vec3 vSphericalZ;
uniform vec3 vSphericalXX_ZZ;
uniform vec3 vSphericalYY_ZZ;
uniform vec3 vSphericalZZ;
uniform vec3 vSphericalXY;
uniform vec3 vSphericalYZ;
uniform vec3 vSphericalZX;
#endif
#endif
#endif
#endif
#ifdef DETAIL
uniform vec4 vDetailInfos;
uniform mat4 detailMatrix;
#endif
#include<decalVertexDeclaration>
#define ADDITIONAL_VERTEX_DECLARATION
`;
C.IncludesShadersStore[Ol] = Ll;
const Dl = "pbrVertexShader", Pl = `precision highp float;
#include<__decl__pbrVertex>
#define CUSTOM_VERTEX_BEGIN
attribute vec3 position;
#ifdef NORMAL
attribute vec3 normal;
#endif
#ifdef TANGENT
attribute vec4 tangent;
#endif
#ifdef UV1
attribute vec2 uv;
#endif
#include<uvAttributeDeclaration>[2..7]
#include<mainUVVaryingDeclaration>[1..7]
#ifdef VERTEXCOLOR
attribute vec4 color;
#endif
#include<helperFunctions>
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
#include<prePassVertexDeclaration>
#include<samplerVertexDeclaration>(_DEFINENAME_,ALBEDO,_VARYINGNAME_,Albedo)
#include<samplerVertexDeclaration>(_DEFINENAME_,DETAIL,_VARYINGNAME_,Detail)
#include<samplerVertexDeclaration>(_DEFINENAME_,AMBIENT,_VARYINGNAME_,Ambient)
#include<samplerVertexDeclaration>(_DEFINENAME_,OPACITY,_VARYINGNAME_,Opacity)
#include<samplerVertexDeclaration>(_DEFINENAME_,EMISSIVE,_VARYINGNAME_,Emissive)
#include<samplerVertexDeclaration>(_DEFINENAME_,LIGHTMAP,_VARYINGNAME_,Lightmap)
#include<samplerVertexDeclaration>(_DEFINENAME_,REFLECTIVITY,_VARYINGNAME_,Reflectivity)
#include<samplerVertexDeclaration>(_DEFINENAME_,MICROSURFACEMAP,_VARYINGNAME_,MicroSurfaceSampler)
#include<samplerVertexDeclaration>(_DEFINENAME_,METALLIC_REFLECTANCE,_VARYINGNAME_,MetallicReflectance)
#include<samplerVertexDeclaration>(_DEFINENAME_,REFLECTANCE,_VARYINGNAME_,Reflectance)
#include<samplerVertexDeclaration>(_DEFINENAME_,BUMP,_VARYINGNAME_,Bump)
#include<samplerVertexDeclaration>(_DEFINENAME_,DECAL,_VARYINGNAME_,Decal)
#ifdef CLEARCOAT
#include<samplerVertexDeclaration>(_DEFINENAME_,CLEARCOAT_TEXTURE,_VARYINGNAME_,ClearCoat)
#include<samplerVertexDeclaration>(_DEFINENAME_,CLEARCOAT_TEXTURE_ROUGHNESS,_VARYINGNAME_,ClearCoatRoughness)
#include<samplerVertexDeclaration>(_DEFINENAME_,CLEARCOAT_BUMP,_VARYINGNAME_,ClearCoatBump)
#include<samplerVertexDeclaration>(_DEFINENAME_,CLEARCOAT_TINT_TEXTURE,_VARYINGNAME_,ClearCoatTint)
#endif
#ifdef IRIDESCENCE
#include<samplerVertexDeclaration>(_DEFINENAME_,IRIDESCENCE_TEXTURE,_VARYINGNAME_,Iridescence)
#include<samplerVertexDeclaration>(_DEFINENAME_,IRIDESCENCE_THICKNESS_TEXTURE,_VARYINGNAME_,IridescenceThickness)
#endif
#ifdef SHEEN
#include<samplerVertexDeclaration>(_DEFINENAME_,SHEEN_TEXTURE,_VARYINGNAME_,Sheen)
#include<samplerVertexDeclaration>(_DEFINENAME_,SHEEN_TEXTURE_ROUGHNESS,_VARYINGNAME_,SheenRoughness)
#endif
#ifdef ANISOTROPIC
#include<samplerVertexDeclaration>(_DEFINENAME_,ANISOTROPIC_TEXTURE,_VARYINGNAME_,Anisotropy)
#endif
#ifdef SUBSURFACE
#include<samplerVertexDeclaration>(_DEFINENAME_,SS_THICKNESSANDMASK_TEXTURE,_VARYINGNAME_,Thickness)
#include<samplerVertexDeclaration>(_DEFINENAME_,SS_REFRACTIONINTENSITY_TEXTURE,_VARYINGNAME_,RefractionIntensity)
#include<samplerVertexDeclaration>(_DEFINENAME_,SS_TRANSLUCENCYINTENSITY_TEXTURE,_VARYINGNAME_,TranslucencyIntensity)
#endif
varying vec3 vPositionW;
#if DEBUGMODE>0
varying vec4 vClipSpacePosition;
#endif
#ifdef NORMAL
varying vec3 vNormalW;
#if defined(USESPHERICALFROMREFLECTIONMAP) && defined(USESPHERICALINVERTEX)
varying vec3 vEnvironmentIrradiance;
#include<harmonicsFunctions>
#endif
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vec4 vColor;
#endif
#include<bumpVertexDeclaration>
#include<clipPlaneVertexDeclaration>
#include<fogVertexDeclaration>
#include<__decl__lightVxFragment>[0..maxSimultaneousLights]
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#ifdef REFLECTIONMAP_SKYBOX
varying vec3 vPositionUVW;
#endif
#if defined(REFLECTIONMAP_EQUIRECTANGULAR_FIXED) || defined(REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED)
varying vec3 vDirectionW;
#endif
#include<logDepthDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vec3 positionUpdated=position;
#ifdef NORMAL
vec3 normalUpdated=normal;
#endif
#ifdef TANGENT
vec4 tangentUpdated=tangent;
#endif
#ifdef UV1
vec2 uvUpdated=uv;
#endif
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#ifdef REFLECTIONMAP_SKYBOX
vPositionUVW=positionUpdated;
#endif
#define CUSTOM_VERTEX_UPDATE_POSITION
#define CUSTOM_VERTEX_UPDATE_NORMAL
#include<instancesVertex>
#if defined(PREPASS) && defined(PREPASS_VELOCITY) && !defined(BONES_VELOCITY_ENABLED)
vCurrentPosition=viewProjection*finalWorld*vec4(positionUpdated,1.0);
vPreviousPosition=previousViewProjection*finalPreviousWorld*vec4(positionUpdated,1.0);
#endif
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(positionUpdated,1.0);
vPositionW=vec3(worldPos);
#include<prePassVertex>
#ifdef NORMAL
mat3 normalWorld=mat3(finalWorld);
#if defined(INSTANCES) && defined(THIN_INSTANCES)
vNormalW=normalUpdated/vec3(dot(normalWorld[0],normalWorld[0]),dot(normalWorld[1],normalWorld[1]),dot(normalWorld[2],normalWorld[2]));
vNormalW=normalize(normalWorld*vNormalW);
#else
#ifdef NONUNIFORMSCALING
normalWorld=transposeMat3(inverseMat3(normalWorld));
#endif
vNormalW=normalize(normalWorld*normalUpdated);
#endif
#if defined(USESPHERICALFROMREFLECTIONMAP) && defined(USESPHERICALINVERTEX)
vec3 reflectionVector=vec3(reflectionMatrix*vec4(vNormalW,0)).xyz;
#ifdef REFLECTIONMAP_OPPOSITEZ
reflectionVector.z*=-1.0;
#endif
vEnvironmentIrradiance=computeEnvironmentIrradiance(reflectionVector);
#endif
#endif
#define CUSTOM_VERTEX_UPDATE_WORLDPOS
#ifdef MULTIVIEW
if (gl_ViewID_OVR==0u) {
gl_Position=viewProjection*worldPos;
} else {
gl_Position=viewProjectionR*worldPos;
}
#else
gl_Position=viewProjection*worldPos;
#endif
#if DEBUGMODE>0
vClipSpacePosition=gl_Position;
#endif
#if defined(REFLECTIONMAP_EQUIRECTANGULAR_FIXED) || defined(REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED)
vDirectionW=normalize(vec3(finalWorld*vec4(positionUpdated,0.0)));
#endif
#ifndef UV1
vec2 uvUpdated=vec2(0.,0.);
#endif
#ifdef MAINUV1
vMainUV1=uvUpdated;
#endif
#include<uvVariableDeclaration>[2..7]
#include<samplerVertexImplementation>(_DEFINENAME_,ALBEDO,_VARYINGNAME_,Albedo,_MATRIXNAME_,albedo,_INFONAME_,AlbedoInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,DETAIL,_VARYINGNAME_,Detail,_MATRIXNAME_,detail,_INFONAME_,DetailInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,AMBIENT,_VARYINGNAME_,Ambient,_MATRIXNAME_,ambient,_INFONAME_,AmbientInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,OPACITY,_VARYINGNAME_,Opacity,_MATRIXNAME_,opacity,_INFONAME_,OpacityInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,EMISSIVE,_VARYINGNAME_,Emissive,_MATRIXNAME_,emissive,_INFONAME_,EmissiveInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,LIGHTMAP,_VARYINGNAME_,Lightmap,_MATRIXNAME_,lightmap,_INFONAME_,LightmapInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,REFLECTIVITY,_VARYINGNAME_,Reflectivity,_MATRIXNAME_,reflectivity,_INFONAME_,ReflectivityInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,MICROSURFACEMAP,_VARYINGNAME_,MicroSurfaceSampler,_MATRIXNAME_,microSurfaceSampler,_INFONAME_,MicroSurfaceSamplerInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,METALLIC_REFLECTANCE,_VARYINGNAME_,MetallicReflectance,_MATRIXNAME_,metallicReflectance,_INFONAME_,MetallicReflectanceInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,REFLECTANCE,_VARYINGNAME_,Reflectance,_MATRIXNAME_,reflectance,_INFONAME_,ReflectanceInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,BUMP,_VARYINGNAME_,Bump,_MATRIXNAME_,bump,_INFONAME_,BumpInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,DECAL,_VARYINGNAME_,Decal,_MATRIXNAME_,decal,_INFONAME_,DecalInfos.x)
#ifdef CLEARCOAT
#include<samplerVertexImplementation>(_DEFINENAME_,CLEARCOAT_TEXTURE,_VARYINGNAME_,ClearCoat,_MATRIXNAME_,clearCoat,_INFONAME_,ClearCoatInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,CLEARCOAT_TEXTURE_ROUGHNESS,_VARYINGNAME_,ClearCoatRoughness,_MATRIXNAME_,clearCoatRoughness,_INFONAME_,ClearCoatInfos.z)
#include<samplerVertexImplementation>(_DEFINENAME_,CLEARCOAT_BUMP,_VARYINGNAME_,ClearCoatBump,_MATRIXNAME_,clearCoatBump,_INFONAME_,ClearCoatBumpInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,CLEARCOAT_TINT_TEXTURE,_VARYINGNAME_,ClearCoatTint,_MATRIXNAME_,clearCoatTint,_INFONAME_,ClearCoatTintInfos.x)
#endif
#ifdef IRIDESCENCE
#include<samplerVertexImplementation>(_DEFINENAME_,IRIDESCENCE_TEXTURE,_VARYINGNAME_,Iridescence,_MATRIXNAME_,iridescence,_INFONAME_,IridescenceInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,IRIDESCENCE_THICKNESS_TEXTURE,_VARYINGNAME_,IridescenceThickness,_MATRIXNAME_,iridescenceThickness,_INFONAME_,IridescenceInfos.z)
#endif
#ifdef SHEEN
#include<samplerVertexImplementation>(_DEFINENAME_,SHEEN_TEXTURE,_VARYINGNAME_,Sheen,_MATRIXNAME_,sheen,_INFONAME_,SheenInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,SHEEN_TEXTURE_ROUGHNESS,_VARYINGNAME_,SheenRoughness,_MATRIXNAME_,sheen,_INFONAME_,SheenInfos.z)
#endif
#ifdef ANISOTROPIC
#include<samplerVertexImplementation>(_DEFINENAME_,ANISOTROPIC_TEXTURE,_VARYINGNAME_,Anisotropy,_MATRIXNAME_,anisotropy,_INFONAME_,AnisotropyInfos.x)
#endif
#ifdef SUBSURFACE
#include<samplerVertexImplementation>(_DEFINENAME_,SS_THICKNESSANDMASK_TEXTURE,_VARYINGNAME_,Thickness,_MATRIXNAME_,thickness,_INFONAME_,ThicknessInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,SS_REFRACTIONINTENSITY_TEXTURE,_VARYINGNAME_,RefractionIntensity,_MATRIXNAME_,refractionIntensity,_INFONAME_,RefractionIntensityInfos.x)
#include<samplerVertexImplementation>(_DEFINENAME_,SS_TRANSLUCENCYINTENSITY_TEXTURE,_VARYINGNAME_,TranslucencyIntensity,_MATRIXNAME_,translucencyIntensity,_INFONAME_,TranslucencyIntensityInfos.x)
#endif
#include<bumpVertex>
#include<clipPlaneVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#include<vertexColorMixing>
#if defined(POINTSIZE) && !defined(WEBGPU)
gl_PointSize=pointSize;
#endif
#include<logDepthVertex>
#define CUSTOM_VERTEX_MAIN_END
}`;
C.ShadersStore[Dl] = Pl;
class bl extends ye {
  constructor() {
    super(...arguments), this.CLEARCOAT = !1, this.CLEARCOAT_DEFAULTIOR = !1, this.CLEARCOAT_TEXTURE = !1, this.CLEARCOAT_TEXTURE_ROUGHNESS = !1, this.CLEARCOAT_TEXTUREDIRECTUV = 0, this.CLEARCOAT_TEXTURE_ROUGHNESSDIRECTUV = 0, this.CLEARCOAT_BUMP = !1, this.CLEARCOAT_BUMPDIRECTUV = 0, this.CLEARCOAT_USE_ROUGHNESS_FROM_MAINTEXTURE = !1, this.CLEARCOAT_TEXTURE_ROUGHNESS_IDENTICAL = !1, this.CLEARCOAT_REMAP_F0 = !1, this.CLEARCOAT_TINT = !1, this.CLEARCOAT_TINT_TEXTURE = !1, this.CLEARCOAT_TINT_TEXTUREDIRECTUV = 0, this.CLEARCOAT_TINT_GAMMATEXTURE = !1;
  }
}
class ae extends we {
  /** @internal */
  _markAllSubMeshesAsTexturesDirty() {
    this._enable(this._isEnabled), this._internalMarkAllSubMeshesAsTexturesDirty();
  }
  constructor(e, t = !0) {
    super(e, "PBRClearCoat", 100, new bl(), t), this._isEnabled = !1, this.isEnabled = !1, this.intensity = 1, this.roughness = 0, this._indexOfRefraction = ae._DefaultIndexOfRefraction, this.indexOfRefraction = ae._DefaultIndexOfRefraction, this._texture = null, this.texture = null, this._useRoughnessFromMainTexture = !0, this.useRoughnessFromMainTexture = !0, this._textureRoughness = null, this.textureRoughness = null, this._remapF0OnInterfaceChange = !0, this.remapF0OnInterfaceChange = !0, this._bumpTexture = null, this.bumpTexture = null, this._isTintEnabled = !1, this.isTintEnabled = !1, this.tintColor = K.White(), this.tintColorAtDistance = 1, this.tintThickness = 1, this._tintTexture = null, this.tintTexture = null, this._internalMarkAllSubMeshesAsTexturesDirty = e._dirtyCallbacks[1];
  }
  isReadyForSubMesh(e, t, i) {
    if (!this._isEnabled)
      return !0;
    const r = this._material._disableBumpMap;
    return !(e._areTexturesDirty && t.texturesEnabled && (this._texture && S.ClearCoatTextureEnabled && !this._texture.isReadyOrNotBlocking() || this._textureRoughness && S.ClearCoatTextureEnabled && !this._textureRoughness.isReadyOrNotBlocking() || i.getCaps().standardDerivatives && this._bumpTexture && S.ClearCoatBumpTextureEnabled && !r && !this._bumpTexture.isReady() || this._isTintEnabled && this._tintTexture && S.ClearCoatTintTextureEnabled && !this._tintTexture.isReadyOrNotBlocking()));
  }
  prepareDefinesBeforeAttributes(e, t) {
    var i;
    this._isEnabled ? (e.CLEARCOAT = !0, e.CLEARCOAT_USE_ROUGHNESS_FROM_MAINTEXTURE = this._useRoughnessFromMainTexture, e.CLEARCOAT_TEXTURE_ROUGHNESS_IDENTICAL = this._texture !== null && this._texture._texture === ((i = this._textureRoughness) === null || i === void 0 ? void 0 : i._texture) && this._texture.checkTransformsAreIdentical(this._textureRoughness), e.CLEARCOAT_REMAP_F0 = this._remapF0OnInterfaceChange, e._areTexturesDirty && t.texturesEnabled && (this._texture && S.ClearCoatTextureEnabled ? M.PrepareDefinesForMergedUV(this._texture, e, "CLEARCOAT_TEXTURE") : e.CLEARCOAT_TEXTURE = !1, this._textureRoughness && S.ClearCoatTextureEnabled ? M.PrepareDefinesForMergedUV(this._textureRoughness, e, "CLEARCOAT_TEXTURE_ROUGHNESS") : e.CLEARCOAT_TEXTURE_ROUGHNESS = !1, this._bumpTexture && S.ClearCoatBumpTextureEnabled ? M.PrepareDefinesForMergedUV(this._bumpTexture, e, "CLEARCOAT_BUMP") : e.CLEARCOAT_BUMP = !1, e.CLEARCOAT_DEFAULTIOR = this._indexOfRefraction === ae._DefaultIndexOfRefraction, this._isTintEnabled ? (e.CLEARCOAT_TINT = !0, this._tintTexture && S.ClearCoatTintTextureEnabled ? (M.PrepareDefinesForMergedUV(this._tintTexture, e, "CLEARCOAT_TINT_TEXTURE"), e.CLEARCOAT_TINT_GAMMATEXTURE = this._tintTexture.gammaSpace) : e.CLEARCOAT_TINT_TEXTURE = !1) : (e.CLEARCOAT_TINT = !1, e.CLEARCOAT_TINT_TEXTURE = !1))) : (e.CLEARCOAT = !1, e.CLEARCOAT_TEXTURE = !1, e.CLEARCOAT_TEXTURE_ROUGHNESS = !1, e.CLEARCOAT_BUMP = !1, e.CLEARCOAT_TINT = !1, e.CLEARCOAT_TINT_TEXTURE = !1, e.CLEARCOAT_USE_ROUGHNESS_FROM_MAINTEXTURE = !1, e.CLEARCOAT_TEXTURE_ROUGHNESS_IDENTICAL = !1, e.CLEARCOAT_DEFAULTIOR = !1, e.CLEARCOAT_TEXTUREDIRECTUV = 0, e.CLEARCOAT_TEXTURE_ROUGHNESSDIRECTUV = 0, e.CLEARCOAT_BUMPDIRECTUV = 0, e.CLEARCOAT_REMAP_F0 = !1, e.CLEARCOAT_TINT_TEXTUREDIRECTUV = 0, e.CLEARCOAT_TINT_GAMMATEXTURE = !1);
  }
  bindForSubMesh(e, t, i, r) {
    var s, n, o, a, f, c, d, E;
    if (!this._isEnabled)
      return;
    const u = r.materialDefines, _ = this._material.isFrozen, p = this._material._disableBumpMap, A = this._material._invertNormalMapX, R = this._material._invertNormalMapY, N = u.CLEARCOAT_TEXTURE_ROUGHNESS_IDENTICAL;
    if (!e.useUbo || !_ || !e.isSync) {
      N && S.ClearCoatTextureEnabled ? (e.updateFloat4("vClearCoatInfos", this._texture.coordinatesIndex, this._texture.level, -1, -1), M.BindTextureMatrix(this._texture, e, "clearCoat")) : (this._texture || this._textureRoughness) && S.ClearCoatTextureEnabled && (e.updateFloat4("vClearCoatInfos", (n = (s = this._texture) === null || s === void 0 ? void 0 : s.coordinatesIndex) !== null && n !== void 0 ? n : 0, (a = (o = this._texture) === null || o === void 0 ? void 0 : o.level) !== null && a !== void 0 ? a : 0, (c = (f = this._textureRoughness) === null || f === void 0 ? void 0 : f.coordinatesIndex) !== null && c !== void 0 ? c : 0, (E = (d = this._textureRoughness) === null || d === void 0 ? void 0 : d.level) !== null && E !== void 0 ? E : 0), this._texture && M.BindTextureMatrix(this._texture, e, "clearCoat"), this._textureRoughness && !N && !u.CLEARCOAT_USE_ROUGHNESS_FROM_MAINTEXTURE && M.BindTextureMatrix(this._textureRoughness, e, "clearCoatRoughness")), this._bumpTexture && i.getCaps().standardDerivatives && S.ClearCoatTextureEnabled && !p && (e.updateFloat2("vClearCoatBumpInfos", this._bumpTexture.coordinatesIndex, this._bumpTexture.level), M.BindTextureMatrix(this._bumpTexture, e, "clearCoatBump"), t._mirroredCameraPosition ? e.updateFloat2("vClearCoatTangentSpaceParams", A ? 1 : -1, R ? 1 : -1) : e.updateFloat2("vClearCoatTangentSpaceParams", A ? -1 : 1, R ? -1 : 1)), this._tintTexture && S.ClearCoatTintTextureEnabled && (e.updateFloat2("vClearCoatTintInfos", this._tintTexture.coordinatesIndex, this._tintTexture.level), M.BindTextureMatrix(this._tintTexture, e, "clearCoatTint")), e.updateFloat2("vClearCoatParams", this.intensity, this.roughness);
      const O = 1 - this._indexOfRefraction, L = 1 + this._indexOfRefraction, U = Math.pow(-O / L, 2), y = 1 / this._indexOfRefraction;
      e.updateFloat4("vClearCoatRefractionParams", U, y, O, L), this._isTintEnabled && (e.updateFloat4("vClearCoatTintParams", this.tintColor.r, this.tintColor.g, this.tintColor.b, Math.max(1e-5, this.tintThickness)), e.updateFloat("clearCoatColorAtDistance", Math.max(1e-5, this.tintColorAtDistance)));
    }
    t.texturesEnabled && (this._texture && S.ClearCoatTextureEnabled && e.setTexture("clearCoatSampler", this._texture), this._textureRoughness && !N && !u.CLEARCOAT_USE_ROUGHNESS_FROM_MAINTEXTURE && S.ClearCoatTextureEnabled && e.setTexture("clearCoatRoughnessSampler", this._textureRoughness), this._bumpTexture && i.getCaps().standardDerivatives && S.ClearCoatBumpTextureEnabled && !p && e.setTexture("clearCoatBumpSampler", this._bumpTexture), this._isTintEnabled && this._tintTexture && S.ClearCoatTintTextureEnabled && e.setTexture("clearCoatTintSampler", this._tintTexture));
  }
  hasTexture(e) {
    return this._texture === e || this._textureRoughness === e || this._bumpTexture === e || this._tintTexture === e;
  }
  getActiveTextures(e) {
    this._texture && e.push(this._texture), this._textureRoughness && e.push(this._textureRoughness), this._bumpTexture && e.push(this._bumpTexture), this._tintTexture && e.push(this._tintTexture);
  }
  getAnimatables(e) {
    this._texture && this._texture.animations && this._texture.animations.length > 0 && e.push(this._texture), this._textureRoughness && this._textureRoughness.animations && this._textureRoughness.animations.length > 0 && e.push(this._textureRoughness), this._bumpTexture && this._bumpTexture.animations && this._bumpTexture.animations.length > 0 && e.push(this._bumpTexture), this._tintTexture && this._tintTexture.animations && this._tintTexture.animations.length > 0 && e.push(this._tintTexture);
  }
  dispose(e) {
    var t, i, r, s;
    e && ((t = this._texture) === null || t === void 0 || t.dispose(), (i = this._textureRoughness) === null || i === void 0 || i.dispose(), (r = this._bumpTexture) === null || r === void 0 || r.dispose(), (s = this._tintTexture) === null || s === void 0 || s.dispose());
  }
  getClassName() {
    return "PBRClearCoatConfiguration";
  }
  addFallbacks(e, t, i) {
    return e.CLEARCOAT_BUMP && t.addFallback(i++, "CLEARCOAT_BUMP"), e.CLEARCOAT_TINT && t.addFallback(i++, "CLEARCOAT_TINT"), e.CLEARCOAT && t.addFallback(i++, "CLEARCOAT"), i;
  }
  getSamplers(e) {
    e.push("clearCoatSampler", "clearCoatRoughnessSampler", "clearCoatBumpSampler", "clearCoatTintSampler");
  }
  getUniforms() {
    return {
      ubo: [
        { name: "vClearCoatParams", size: 2, type: "vec2" },
        { name: "vClearCoatRefractionParams", size: 4, type: "vec4" },
        { name: "vClearCoatInfos", size: 4, type: "vec4" },
        { name: "clearCoatMatrix", size: 16, type: "mat4" },
        { name: "clearCoatRoughnessMatrix", size: 16, type: "mat4" },
        { name: "vClearCoatBumpInfos", size: 2, type: "vec2" },
        { name: "vClearCoatTangentSpaceParams", size: 2, type: "vec2" },
        { name: "clearCoatBumpMatrix", size: 16, type: "mat4" },
        { name: "vClearCoatTintParams", size: 4, type: "vec4" },
        { name: "clearCoatColorAtDistance", size: 1, type: "float" },
        { name: "vClearCoatTintInfos", size: 2, type: "vec2" },
        { name: "clearCoatTintMatrix", size: 16, type: "mat4" }
      ]
    };
  }
}
ae._DefaultIndexOfRefraction = 1.5;
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], ae.prototype, "isEnabled", void 0);
h([
  T()
], ae.prototype, "intensity", void 0);
h([
  T()
], ae.prototype, "roughness", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], ae.prototype, "indexOfRefraction", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], ae.prototype, "texture", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], ae.prototype, "useRoughnessFromMainTexture", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], ae.prototype, "textureRoughness", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], ae.prototype, "remapF0OnInterfaceChange", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], ae.prototype, "bumpTexture", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], ae.prototype, "isTintEnabled", void 0);
h([
  ce()
], ae.prototype, "tintColor", void 0);
h([
  T()
], ae.prototype, "tintColorAtDistance", void 0);
h([
  T()
], ae.prototype, "tintThickness", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], ae.prototype, "tintTexture", void 0);
class Fl extends ye {
  constructor() {
    super(...arguments), this.IRIDESCENCE = !1, this.IRIDESCENCE_TEXTURE = !1, this.IRIDESCENCE_TEXTUREDIRECTUV = 0, this.IRIDESCENCE_THICKNESS_TEXTURE = !1, this.IRIDESCENCE_THICKNESS_TEXTUREDIRECTUV = 0, this.IRIDESCENCE_USE_THICKNESS_FROM_MAINTEXTURE = !1;
  }
}
class _e extends we {
  /** @internal */
  _markAllSubMeshesAsTexturesDirty() {
    this._enable(this._isEnabled), this._internalMarkAllSubMeshesAsTexturesDirty();
  }
  constructor(e, t = !0) {
    super(e, "PBRIridescence", 110, new Fl(), t), this._isEnabled = !1, this.isEnabled = !1, this.intensity = 1, this.minimumThickness = _e._DefaultMinimumThickness, this.maximumThickness = _e._DefaultMaximumThickness, this.indexOfRefraction = _e._DefaultIndexOfRefraction, this._texture = null, this.texture = null, this._thicknessTexture = null, this.thicknessTexture = null, this._internalMarkAllSubMeshesAsTexturesDirty = e._dirtyCallbacks[1];
  }
  isReadyForSubMesh(e, t) {
    return this._isEnabled ? !(e._areTexturesDirty && t.texturesEnabled && (this._texture && S.IridescenceTextureEnabled && !this._texture.isReadyOrNotBlocking() || this._thicknessTexture && S.IridescenceTextureEnabled && !this._thicknessTexture.isReadyOrNotBlocking())) : !0;
  }
  prepareDefinesBeforeAttributes(e, t) {
    var i;
    this._isEnabled ? (e.IRIDESCENCE = !0, e.IRIDESCENCE_USE_THICKNESS_FROM_MAINTEXTURE = this._texture !== null && this._texture._texture === ((i = this._thicknessTexture) === null || i === void 0 ? void 0 : i._texture) && this._texture.checkTransformsAreIdentical(this._thicknessTexture), e._areTexturesDirty && t.texturesEnabled && (this._texture && S.IridescenceTextureEnabled ? M.PrepareDefinesForMergedUV(this._texture, e, "IRIDESCENCE_TEXTURE") : e.IRIDESCENCE_TEXTURE = !1, !e.IRIDESCENCE_USE_THICKNESS_FROM_MAINTEXTURE && this._thicknessTexture && S.IridescenceTextureEnabled ? M.PrepareDefinesForMergedUV(this._thicknessTexture, e, "IRIDESCENCE_THICKNESS_TEXTURE") : e.IRIDESCENCE_THICKNESS_TEXTURE = !1)) : (e.IRIDESCENCE = !1, e.IRIDESCENCE_TEXTURE = !1, e.IRIDESCENCE_THICKNESS_TEXTURE = !1, e.IRIDESCENCE_USE_THICKNESS_FROM_MAINTEXTURE = !1, e.IRIDESCENCE_TEXTUREDIRECTUV = 0, e.IRIDESCENCE_THICKNESS_TEXTUREDIRECTUV = 0);
  }
  bindForSubMesh(e, t, i, r) {
    var s, n, o, a, f, c, d, E;
    if (!this._isEnabled)
      return;
    const u = r.materialDefines, _ = this._material.isFrozen, p = u.IRIDESCENCE_USE_THICKNESS_FROM_MAINTEXTURE;
    (!e.useUbo || !_ || !e.isSync) && (p && S.IridescenceTextureEnabled ? (e.updateFloat4("vIridescenceInfos", this._texture.coordinatesIndex, this._texture.level, -1, -1), M.BindTextureMatrix(this._texture, e, "iridescence")) : (this._texture || this._thicknessTexture) && S.IridescenceTextureEnabled && (e.updateFloat4("vIridescenceInfos", (n = (s = this._texture) === null || s === void 0 ? void 0 : s.coordinatesIndex) !== null && n !== void 0 ? n : 0, (a = (o = this._texture) === null || o === void 0 ? void 0 : o.level) !== null && a !== void 0 ? a : 0, (c = (f = this._thicknessTexture) === null || f === void 0 ? void 0 : f.coordinatesIndex) !== null && c !== void 0 ? c : 0, (E = (d = this._thicknessTexture) === null || d === void 0 ? void 0 : d.level) !== null && E !== void 0 ? E : 0), this._texture && M.BindTextureMatrix(this._texture, e, "iridescence"), this._thicknessTexture && !p && !u.IRIDESCENCE_USE_THICKNESS_FROM_MAINTEXTURE && M.BindTextureMatrix(this._thicknessTexture, e, "iridescenceThickness")), e.updateFloat4("vIridescenceParams", this.intensity, this.indexOfRefraction, this.minimumThickness, this.maximumThickness)), t.texturesEnabled && (this._texture && S.IridescenceTextureEnabled && e.setTexture("iridescenceSampler", this._texture), this._thicknessTexture && !p && !u.IRIDESCENCE_USE_THICKNESS_FROM_MAINTEXTURE && S.IridescenceTextureEnabled && e.setTexture("iridescenceThicknessSampler", this._thicknessTexture));
  }
  hasTexture(e) {
    return this._texture === e || this._thicknessTexture === e;
  }
  getActiveTextures(e) {
    this._texture && e.push(this._texture), this._thicknessTexture && e.push(this._thicknessTexture);
  }
  getAnimatables(e) {
    this._texture && this._texture.animations && this._texture.animations.length > 0 && e.push(this._texture), this._thicknessTexture && this._thicknessTexture.animations && this._thicknessTexture.animations.length > 0 && e.push(this._thicknessTexture);
  }
  dispose(e) {
    var t, i;
    e && ((t = this._texture) === null || t === void 0 || t.dispose(), (i = this._thicknessTexture) === null || i === void 0 || i.dispose());
  }
  getClassName() {
    return "PBRIridescenceConfiguration";
  }
  addFallbacks(e, t, i) {
    return e.IRIDESCENCE && t.addFallback(i++, "IRIDESCENCE"), i;
  }
  getSamplers(e) {
    e.push("iridescenceSampler", "iridescenceThicknessSampler");
  }
  getUniforms() {
    return {
      ubo: [
        { name: "vIridescenceParams", size: 4, type: "vec4" },
        { name: "vIridescenceInfos", size: 4, type: "vec4" },
        { name: "iridescenceMatrix", size: 16, type: "mat4" },
        { name: "iridescenceThicknessMatrix", size: 16, type: "mat4" }
      ]
    };
  }
}
_e._DefaultMinimumThickness = 100;
_e._DefaultMaximumThickness = 400;
_e._DefaultIndexOfRefraction = 1.3;
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], _e.prototype, "isEnabled", void 0);
h([
  T()
], _e.prototype, "intensity", void 0);
h([
  T()
], _e.prototype, "minimumThickness", void 0);
h([
  T()
], _e.prototype, "maximumThickness", void 0);
h([
  T()
], _e.prototype, "indexOfRefraction", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], _e.prototype, "texture", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], _e.prototype, "thicknessTexture", void 0);
class yl extends ye {
  constructor() {
    super(...arguments), this.ANISOTROPIC = !1, this.ANISOTROPIC_TEXTURE = !1, this.ANISOTROPIC_TEXTUREDIRECTUV = 0, this.MAINUV1 = !1;
  }
}
class Pt extends we {
  /** @internal */
  _markAllSubMeshesAsTexturesDirty() {
    this._enable(this._isEnabled), this._internalMarkAllSubMeshesAsTexturesDirty();
  }
  constructor(e, t = !0) {
    super(e, "PBRAnisotropic", 110, new yl(), t), this._isEnabled = !1, this.isEnabled = !1, this.intensity = 1, this.direction = new _t(1, 0), this._texture = null, this.texture = null, this._internalMarkAllSubMeshesAsTexturesDirty = e._dirtyCallbacks[1];
  }
  isReadyForSubMesh(e, t) {
    return this._isEnabled ? !(e._areTexturesDirty && t.texturesEnabled && this._texture && S.AnisotropicTextureEnabled && !this._texture.isReadyOrNotBlocking()) : !0;
  }
  prepareDefinesBeforeAttributes(e, t, i) {
    this._isEnabled ? (e.ANISOTROPIC = this._isEnabled, this._isEnabled && !i.isVerticesDataPresent(k.TangentKind) && (e._needUVs = !0, e.MAINUV1 = !0), e._areTexturesDirty && t.texturesEnabled && (this._texture && S.AnisotropicTextureEnabled ? M.PrepareDefinesForMergedUV(this._texture, e, "ANISOTROPIC_TEXTURE") : e.ANISOTROPIC_TEXTURE = !1)) : (e.ANISOTROPIC = !1, e.ANISOTROPIC_TEXTURE = !1, e.ANISOTROPIC_TEXTUREDIRECTUV = 0);
  }
  bindForSubMesh(e, t) {
    if (!this._isEnabled)
      return;
    const i = this._material.isFrozen;
    (!e.useUbo || !i || !e.isSync) && (this._texture && S.AnisotropicTextureEnabled && (e.updateFloat2("vAnisotropyInfos", this._texture.coordinatesIndex, this._texture.level), M.BindTextureMatrix(this._texture, e, "anisotropy")), e.updateFloat3("vAnisotropy", this.direction.x, this.direction.y, this.intensity)), t.texturesEnabled && this._texture && S.AnisotropicTextureEnabled && e.setTexture("anisotropySampler", this._texture);
  }
  hasTexture(e) {
    return this._texture === e;
  }
  getActiveTextures(e) {
    this._texture && e.push(this._texture);
  }
  getAnimatables(e) {
    this._texture && this._texture.animations && this._texture.animations.length > 0 && e.push(this._texture);
  }
  dispose(e) {
    e && this._texture && this._texture.dispose();
  }
  getClassName() {
    return "PBRAnisotropicConfiguration";
  }
  addFallbacks(e, t, i) {
    return e.ANISOTROPIC && t.addFallback(i++, "ANISOTROPIC"), i;
  }
  getSamplers(e) {
    e.push("anisotropySampler");
  }
  getUniforms() {
    return {
      ubo: [
        { name: "vAnisotropy", size: 3, type: "vec3" },
        { name: "vAnisotropyInfos", size: 2, type: "vec2" },
        { name: "anisotropyMatrix", size: 16, type: "mat4" }
      ]
    };
  }
}
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], Pt.prototype, "isEnabled", void 0);
h([
  T()
], Pt.prototype, "intensity", void 0);
h([
  Di()
], Pt.prototype, "direction", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], Pt.prototype, "texture", void 0);
class Ul extends ye {
  constructor() {
    super(...arguments), this.SHEEN = !1, this.SHEEN_TEXTURE = !1, this.SHEEN_GAMMATEXTURE = !1, this.SHEEN_TEXTURE_ROUGHNESS = !1, this.SHEEN_TEXTUREDIRECTUV = 0, this.SHEEN_TEXTURE_ROUGHNESSDIRECTUV = 0, this.SHEEN_LINKWITHALBEDO = !1, this.SHEEN_ROUGHNESS = !1, this.SHEEN_ALBEDOSCALING = !1, this.SHEEN_USE_ROUGHNESS_FROM_MAINTEXTURE = !1, this.SHEEN_TEXTURE_ROUGHNESS_IDENTICAL = !1;
  }
}
class Be extends we {
  /** @internal */
  _markAllSubMeshesAsTexturesDirty() {
    this._enable(this._isEnabled), this._internalMarkAllSubMeshesAsTexturesDirty();
  }
  constructor(e, t = !0) {
    super(e, "Sheen", 120, new Ul(), t), this._isEnabled = !1, this.isEnabled = !1, this._linkSheenWithAlbedo = !1, this.linkSheenWithAlbedo = !1, this.intensity = 1, this.color = K.White(), this._texture = null, this.texture = null, this._useRoughnessFromMainTexture = !0, this.useRoughnessFromMainTexture = !0, this._roughness = null, this.roughness = null, this._textureRoughness = null, this.textureRoughness = null, this._albedoScaling = !1, this.albedoScaling = !1, this._internalMarkAllSubMeshesAsTexturesDirty = e._dirtyCallbacks[1];
  }
  isReadyForSubMesh(e, t) {
    return this._isEnabled ? !(e._areTexturesDirty && t.texturesEnabled && (this._texture && S.SheenTextureEnabled && !this._texture.isReadyOrNotBlocking() || this._textureRoughness && S.SheenTextureEnabled && !this._textureRoughness.isReadyOrNotBlocking())) : !0;
  }
  prepareDefinesBeforeAttributes(e, t) {
    var i;
    this._isEnabled ? (e.SHEEN = !0, e.SHEEN_LINKWITHALBEDO = this._linkSheenWithAlbedo, e.SHEEN_ROUGHNESS = this._roughness !== null, e.SHEEN_ALBEDOSCALING = this._albedoScaling, e.SHEEN_USE_ROUGHNESS_FROM_MAINTEXTURE = this._useRoughnessFromMainTexture, e.SHEEN_TEXTURE_ROUGHNESS_IDENTICAL = this._texture !== null && this._texture._texture === ((i = this._textureRoughness) === null || i === void 0 ? void 0 : i._texture) && this._texture.checkTransformsAreIdentical(this._textureRoughness), e._areTexturesDirty && t.texturesEnabled && (this._texture && S.SheenTextureEnabled ? (M.PrepareDefinesForMergedUV(this._texture, e, "SHEEN_TEXTURE"), e.SHEEN_GAMMATEXTURE = this._texture.gammaSpace) : e.SHEEN_TEXTURE = !1, this._textureRoughness && S.SheenTextureEnabled ? M.PrepareDefinesForMergedUV(this._textureRoughness, e, "SHEEN_TEXTURE_ROUGHNESS") : e.SHEEN_TEXTURE_ROUGHNESS = !1)) : (e.SHEEN = !1, e.SHEEN_TEXTURE = !1, e.SHEEN_TEXTURE_ROUGHNESS = !1, e.SHEEN_LINKWITHALBEDO = !1, e.SHEEN_ROUGHNESS = !1, e.SHEEN_ALBEDOSCALING = !1, e.SHEEN_USE_ROUGHNESS_FROM_MAINTEXTURE = !1, e.SHEEN_TEXTURE_ROUGHNESS_IDENTICAL = !1, e.SHEEN_GAMMATEXTURE = !1, e.SHEEN_TEXTUREDIRECTUV = 0, e.SHEEN_TEXTURE_ROUGHNESSDIRECTUV = 0);
  }
  bindForSubMesh(e, t, i, r) {
    var s, n, o, a, f, c, d, E;
    if (!this._isEnabled)
      return;
    const u = r.materialDefines, _ = this._material.isFrozen, p = u.SHEEN_TEXTURE_ROUGHNESS_IDENTICAL;
    (!e.useUbo || !_ || !e.isSync) && (p && S.SheenTextureEnabled ? (e.updateFloat4("vSheenInfos", this._texture.coordinatesIndex, this._texture.level, -1, -1), M.BindTextureMatrix(this._texture, e, "sheen")) : (this._texture || this._textureRoughness) && S.SheenTextureEnabled && (e.updateFloat4("vSheenInfos", (n = (s = this._texture) === null || s === void 0 ? void 0 : s.coordinatesIndex) !== null && n !== void 0 ? n : 0, (a = (o = this._texture) === null || o === void 0 ? void 0 : o.level) !== null && a !== void 0 ? a : 0, (c = (f = this._textureRoughness) === null || f === void 0 ? void 0 : f.coordinatesIndex) !== null && c !== void 0 ? c : 0, (E = (d = this._textureRoughness) === null || d === void 0 ? void 0 : d.level) !== null && E !== void 0 ? E : 0), this._texture && M.BindTextureMatrix(this._texture, e, "sheen"), this._textureRoughness && !p && !u.SHEEN_USE_ROUGHNESS_FROM_MAINTEXTURE && M.BindTextureMatrix(this._textureRoughness, e, "sheenRoughness")), e.updateFloat4("vSheenColor", this.color.r, this.color.g, this.color.b, this.intensity), this._roughness !== null && e.updateFloat("vSheenRoughness", this._roughness)), t.texturesEnabled && (this._texture && S.SheenTextureEnabled && e.setTexture("sheenSampler", this._texture), this._textureRoughness && !p && !u.SHEEN_USE_ROUGHNESS_FROM_MAINTEXTURE && S.SheenTextureEnabled && e.setTexture("sheenRoughnessSampler", this._textureRoughness));
  }
  hasTexture(e) {
    return this._texture === e || this._textureRoughness === e;
  }
  getActiveTextures(e) {
    this._texture && e.push(this._texture), this._textureRoughness && e.push(this._textureRoughness);
  }
  getAnimatables(e) {
    this._texture && this._texture.animations && this._texture.animations.length > 0 && e.push(this._texture), this._textureRoughness && this._textureRoughness.animations && this._textureRoughness.animations.length > 0 && e.push(this._textureRoughness);
  }
  dispose(e) {
    var t, i;
    e && ((t = this._texture) === null || t === void 0 || t.dispose(), (i = this._textureRoughness) === null || i === void 0 || i.dispose());
  }
  getClassName() {
    return "PBRSheenConfiguration";
  }
  addFallbacks(e, t, i) {
    return e.SHEEN && t.addFallback(i++, "SHEEN"), i;
  }
  getSamplers(e) {
    e.push("sheenSampler", "sheenRoughnessSampler");
  }
  getUniforms() {
    return {
      ubo: [
        { name: "vSheenColor", size: 4, type: "vec4" },
        { name: "vSheenRoughness", size: 1, type: "float" },
        { name: "vSheenInfos", size: 4, type: "vec4" },
        { name: "sheenMatrix", size: 16, type: "mat4" },
        { name: "sheenRoughnessMatrix", size: 16, type: "mat4" }
      ]
    };
  }
}
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], Be.prototype, "isEnabled", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], Be.prototype, "linkSheenWithAlbedo", void 0);
h([
  T()
], Be.prototype, "intensity", void 0);
h([
  ce()
], Be.prototype, "color", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], Be.prototype, "texture", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], Be.prototype, "useRoughnessFromMainTexture", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], Be.prototype, "roughness", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], Be.prototype, "textureRoughness", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], Be.prototype, "albedoScaling", void 0);
class wl extends ye {
  constructor() {
    super(...arguments), this.SUBSURFACE = !1, this.SS_REFRACTION = !1, this.SS_REFRACTION_USE_INTENSITY_FROM_TEXTURE = !1, this.SS_TRANSLUCENCY = !1, this.SS_TRANSLUCENCY_USE_INTENSITY_FROM_TEXTURE = !1, this.SS_SCATTERING = !1, this.SS_THICKNESSANDMASK_TEXTURE = !1, this.SS_THICKNESSANDMASK_TEXTUREDIRECTUV = 0, this.SS_HAS_THICKNESS = !1, this.SS_REFRACTIONINTENSITY_TEXTURE = !1, this.SS_REFRACTIONINTENSITY_TEXTUREDIRECTUV = 0, this.SS_TRANSLUCENCYINTENSITY_TEXTURE = !1, this.SS_TRANSLUCENCYINTENSITY_TEXTUREDIRECTUV = 0, this.SS_REFRACTIONMAP_3D = !1, this.SS_REFRACTIONMAP_OPPOSITEZ = !1, this.SS_LODINREFRACTIONALPHA = !1, this.SS_GAMMAREFRACTION = !1, this.SS_RGBDREFRACTION = !1, this.SS_LINEARSPECULARREFRACTION = !1, this.SS_LINKREFRACTIONTOTRANSPARENCY = !1, this.SS_ALBEDOFORREFRACTIONTINT = !1, this.SS_ALBEDOFORTRANSLUCENCYTINT = !1, this.SS_USE_LOCAL_REFRACTIONMAP_CUBIC = !1, this.SS_USE_THICKNESS_AS_DEPTH = !1, this.SS_MASK_FROM_THICKNESS_TEXTURE = !1, this.SS_USE_GLTF_TEXTURES = !1;
  }
}
class J extends we {
  /**
   * Diffusion profile for subsurface scattering.
   * Useful for better scattering in the skins or foliages.
   */
  get scatteringDiffusionProfile() {
    return this._scene.subSurfaceConfiguration ? this._scene.subSurfaceConfiguration.ssDiffusionProfileColors[this._scatteringDiffusionProfileIndex] : null;
  }
  set scatteringDiffusionProfile(e) {
    this._scene.enableSubSurfaceForPrePass() && e && (this._scatteringDiffusionProfileIndex = this._scene.subSurfaceConfiguration.addDiffusionProfile(e));
  }
  /**
   * Index of refraction of the material's volume.
   * https://en.wikipedia.org/wiki/List_of_refractive_indices
   *
   * This ONLY impacts refraction. If not provided or given a non-valid value,
   * the volume will use the same IOR as the surface.
   */
  get volumeIndexOfRefraction() {
    return this._volumeIndexOfRefraction >= 1 ? this._volumeIndexOfRefraction : this._indexOfRefraction;
  }
  set volumeIndexOfRefraction(e) {
    e >= 1 ? this._volumeIndexOfRefraction = e : this._volumeIndexOfRefraction = -1;
  }
  /** @internal */
  _markAllSubMeshesAsTexturesDirty() {
    this._enable(this._isRefractionEnabled || this._isTranslucencyEnabled || this._isScatteringEnabled), this._internalMarkAllSubMeshesAsTexturesDirty();
  }
  /** @internal */
  _markScenePrePassDirty() {
    this._internalMarkAllSubMeshesAsTexturesDirty(), this._internalMarkScenePrePassDirty();
  }
  constructor(e, t = !0) {
    super(e, "PBRSubSurface", 130, new wl(), t), this._isRefractionEnabled = !1, this.isRefractionEnabled = !1, this._isTranslucencyEnabled = !1, this.isTranslucencyEnabled = !1, this._isScatteringEnabled = !1, this.isScatteringEnabled = !1, this._scatteringDiffusionProfileIndex = 0, this.refractionIntensity = 1, this.translucencyIntensity = 1, this.useAlbedoToTintRefraction = !1, this.useAlbedoToTintTranslucency = !1, this._thicknessTexture = null, this.thicknessTexture = null, this._refractionTexture = null, this.refractionTexture = null, this._indexOfRefraction = 1.5, this.indexOfRefraction = 1.5, this._volumeIndexOfRefraction = -1, this._invertRefractionY = !1, this.invertRefractionY = !1, this._linkRefractionWithTransparency = !1, this.linkRefractionWithTransparency = !1, this.minimumThickness = 0, this.maximumThickness = 1, this.useThicknessAsDepth = !1, this.tintColor = K.White(), this.tintColorAtDistance = 1, this.diffusionDistance = K.White(), this._useMaskFromThicknessTexture = !1, this.useMaskFromThicknessTexture = !1, this._refractionIntensityTexture = null, this.refractionIntensityTexture = null, this._translucencyIntensityTexture = null, this.translucencyIntensityTexture = null, this._useGltfStyleTextures = !1, this.useGltfStyleTextures = !1, this._scene = e.getScene(), this.registerForExtraEvents = !0, this._internalMarkAllSubMeshesAsTexturesDirty = e._dirtyCallbacks[1], this._internalMarkScenePrePassDirty = e._dirtyCallbacks[32];
  }
  isReadyForSubMesh(e, t) {
    if (!this._isRefractionEnabled && !this._isTranslucencyEnabled && !this._isScatteringEnabled)
      return !0;
    if (e._areTexturesDirty && t.texturesEnabled) {
      if (this._thicknessTexture && S.ThicknessTextureEnabled && !this._thicknessTexture.isReadyOrNotBlocking())
        return !1;
      const i = this._getRefractionTexture(t);
      if (i && S.RefractionTextureEnabled && !i.isReadyOrNotBlocking())
        return !1;
    }
    return !0;
  }
  prepareDefinesBeforeAttributes(e, t) {
    if (!this._isRefractionEnabled && !this._isTranslucencyEnabled && !this._isScatteringEnabled) {
      e.SUBSURFACE = !1, e.SS_TRANSLUCENCY = !1, e.SS_SCATTERING = !1, e.SS_REFRACTION = !1, e.SS_REFRACTION_USE_INTENSITY_FROM_TEXTURE = !1, e.SS_TRANSLUCENCY_USE_INTENSITY_FROM_TEXTURE = !1, e.SS_THICKNESSANDMASK_TEXTURE = !1, e.SS_THICKNESSANDMASK_TEXTUREDIRECTUV = 0, e.SS_HAS_THICKNESS = !1, e.SS_REFRACTIONINTENSITY_TEXTURE = !1, e.SS_REFRACTIONINTENSITY_TEXTUREDIRECTUV = 0, e.SS_TRANSLUCENCYINTENSITY_TEXTURE = !1, e.SS_TRANSLUCENCYINTENSITY_TEXTUREDIRECTUV = 0, e.SS_REFRACTIONMAP_3D = !1, e.SS_REFRACTIONMAP_OPPOSITEZ = !1, e.SS_LODINREFRACTIONALPHA = !1, e.SS_GAMMAREFRACTION = !1, e.SS_RGBDREFRACTION = !1, e.SS_LINEARSPECULARREFRACTION = !1, e.SS_LINKREFRACTIONTOTRANSPARENCY = !1, e.SS_ALBEDOFORREFRACTIONTINT = !1, e.SS_ALBEDOFORTRANSLUCENCYTINT = !1, e.SS_USE_LOCAL_REFRACTIONMAP_CUBIC = !1, e.SS_USE_THICKNESS_AS_DEPTH = !1, e.SS_MASK_FROM_THICKNESS_TEXTURE = !1, e.SS_USE_GLTF_TEXTURES = !1;
      return;
    }
    if (e._areTexturesDirty) {
      e.SUBSURFACE = !0, e.SS_TRANSLUCENCY = this._isTranslucencyEnabled, e.SS_TRANSLUCENCY_USE_INTENSITY_FROM_TEXTURE = !1, e.SS_SCATTERING = this._isScatteringEnabled, e.SS_THICKNESSANDMASK_TEXTURE = !1, e.SS_REFRACTIONINTENSITY_TEXTURE = !1, e.SS_TRANSLUCENCYINTENSITY_TEXTURE = !1, e.SS_HAS_THICKNESS = !1, e.SS_MASK_FROM_THICKNESS_TEXTURE = !1, e.SS_USE_GLTF_TEXTURES = !1, e.SS_REFRACTION = !1, e.SS_REFRACTION_USE_INTENSITY_FROM_TEXTURE = !1, e.SS_REFRACTIONMAP_3D = !1, e.SS_GAMMAREFRACTION = !1, e.SS_RGBDREFRACTION = !1, e.SS_LINEARSPECULARREFRACTION = !1, e.SS_REFRACTIONMAP_OPPOSITEZ = !1, e.SS_LODINREFRACTIONALPHA = !1, e.SS_LINKREFRACTIONTOTRANSPARENCY = !1, e.SS_ALBEDOFORREFRACTIONTINT = !1, e.SS_ALBEDOFORTRANSLUCENCYTINT = !1, e.SS_USE_LOCAL_REFRACTIONMAP_CUBIC = !1, e.SS_USE_THICKNESS_AS_DEPTH = !1;
      const i = !!this._thicknessTexture && !!this._refractionIntensityTexture && this._refractionIntensityTexture.checkTransformsAreIdentical(this._thicknessTexture) && this._refractionIntensityTexture._texture === this._thicknessTexture._texture, r = !!this._thicknessTexture && !!this._translucencyIntensityTexture && this._translucencyIntensityTexture.checkTransformsAreIdentical(this._thicknessTexture) && this._translucencyIntensityTexture._texture === this._thicknessTexture._texture, s = (i || !this._refractionIntensityTexture) && (r || !this._translucencyIntensityTexture);
      if (e._areTexturesDirty && t.texturesEnabled && (this._thicknessTexture && S.ThicknessTextureEnabled && M.PrepareDefinesForMergedUV(this._thicknessTexture, e, "SS_THICKNESSANDMASK_TEXTURE"), this._refractionIntensityTexture && S.RefractionIntensityTextureEnabled && !s && M.PrepareDefinesForMergedUV(this._refractionIntensityTexture, e, "SS_REFRACTIONINTENSITY_TEXTURE"), this._translucencyIntensityTexture && S.TranslucencyIntensityTextureEnabled && !s && M.PrepareDefinesForMergedUV(this._translucencyIntensityTexture, e, "SS_TRANSLUCENCYINTENSITY_TEXTURE")), e.SS_HAS_THICKNESS = this.maximumThickness - this.minimumThickness !== 0, e.SS_MASK_FROM_THICKNESS_TEXTURE = (this._useMaskFromThicknessTexture || !!this._refractionIntensityTexture || !!this._translucencyIntensityTexture) && s, e.SS_USE_GLTF_TEXTURES = this._useGltfStyleTextures, e.SS_REFRACTION_USE_INTENSITY_FROM_TEXTURE = (this._useMaskFromThicknessTexture || !!this._refractionIntensityTexture) && s, e.SS_TRANSLUCENCY_USE_INTENSITY_FROM_TEXTURE = (this._useMaskFromThicknessTexture || !!this._translucencyIntensityTexture) && s, this._isRefractionEnabled && t.texturesEnabled) {
        const n = this._getRefractionTexture(t);
        n && S.RefractionTextureEnabled && (e.SS_REFRACTION = !0, e.SS_REFRACTIONMAP_3D = n.isCube, e.SS_GAMMAREFRACTION = n.gammaSpace, e.SS_RGBDREFRACTION = n.isRGBD, e.SS_LINEARSPECULARREFRACTION = n.linearSpecularLOD, e.SS_REFRACTIONMAP_OPPOSITEZ = n.invertZ, e.SS_LODINREFRACTIONALPHA = n.lodLevelInAlpha, e.SS_LINKREFRACTIONTOTRANSPARENCY = this._linkRefractionWithTransparency, e.SS_ALBEDOFORREFRACTIONTINT = this.useAlbedoToTintRefraction, e.SS_USE_LOCAL_REFRACTIONMAP_CUBIC = n.isCube && n.boundingBoxSize, e.SS_USE_THICKNESS_AS_DEPTH = this.useThicknessAsDepth);
      }
      this._isTranslucencyEnabled && (e.SS_ALBEDOFORTRANSLUCENCYTINT = this.useAlbedoToTintTranslucency);
    }
  }
  /**
   * Binds the material data (this function is called even if mustRebind() returns false)
   * @param uniformBuffer defines the Uniform buffer to fill in.
   * @param scene defines the scene the material belongs to.
   * @param engine defines the engine the material belongs to.
   * @param subMesh the submesh to bind data for
   */
  hardBindForSubMesh(e, t, i, r) {
    if (!this._isRefractionEnabled && !this._isTranslucencyEnabled && !this._isScatteringEnabled)
      return;
    r.getRenderingMesh().getWorldMatrix().decompose(G.Vector3[0]);
    const s = Math.max(Math.abs(G.Vector3[0].x), Math.abs(G.Vector3[0].y), Math.abs(G.Vector3[0].z));
    e.updateFloat2("vThicknessParam", this.minimumThickness * s, (this.maximumThickness - this.minimumThickness) * s);
  }
  bindForSubMesh(e, t, i, r) {
    if (!this._isRefractionEnabled && !this._isTranslucencyEnabled && !this._isScatteringEnabled)
      return;
    const s = r.materialDefines, n = this._material.isFrozen, o = this._material.realTimeFiltering, a = s.LODBASEDMICROSFURACE, f = this._getRefractionTexture(t);
    if (!e.useUbo || !n || !e.isSync) {
      if (this._thicknessTexture && S.ThicknessTextureEnabled && (e.updateFloat2("vThicknessInfos", this._thicknessTexture.coordinatesIndex, this._thicknessTexture.level), M.BindTextureMatrix(this._thicknessTexture, e, "thickness")), this._refractionIntensityTexture && S.RefractionIntensityTextureEnabled && s.SS_REFRACTIONINTENSITY_TEXTURE && (e.updateFloat2("vRefractionIntensityInfos", this._refractionIntensityTexture.coordinatesIndex, this._refractionIntensityTexture.level), M.BindTextureMatrix(this._refractionIntensityTexture, e, "refractionIntensity")), this._translucencyIntensityTexture && S.TranslucencyIntensityTextureEnabled && s.SS_TRANSLUCENCYINTENSITY_TEXTURE && (e.updateFloat2("vTranslucencyIntensityInfos", this._translucencyIntensityTexture.coordinatesIndex, this._translucencyIntensityTexture.level), M.BindTextureMatrix(this._translucencyIntensityTexture, e, "translucencyIntensity")), f && S.RefractionTextureEnabled) {
        e.updateMatrix("refractionMatrix", f.getReflectionTextureMatrix());
        let c = 1;
        f.isCube || f.depth && (c = f.depth);
        const d = f.getSize().width, E = this.volumeIndexOfRefraction;
        if (e.updateFloat4("vRefractionInfos", f.level, 1 / E, c, this._invertRefractionY ? -1 : 1), e.updateFloat4("vRefractionMicrosurfaceInfos", d, f.lodGenerationScale, f.lodGenerationOffset, 1 / this.indexOfRefraction), o && e.updateFloat2("vRefractionFilteringInfo", d, be.Log2(d)), f.boundingBoxSize) {
          const u = f;
          e.updateVector3("vRefractionPosition", u.boundingBoxPosition), e.updateVector3("vRefractionSize", u.boundingBoxSize);
        }
      }
      this._isScatteringEnabled && e.updateFloat("scatteringDiffusionProfile", this._scatteringDiffusionProfileIndex), e.updateColor3("vDiffusionDistance", this.diffusionDistance), e.updateFloat4("vTintColor", this.tintColor.r, this.tintColor.g, this.tintColor.b, Math.max(1e-5, this.tintColorAtDistance)), e.updateFloat3("vSubSurfaceIntensity", this.refractionIntensity, this.translucencyIntensity, 0);
    }
    t.texturesEnabled && (this._thicknessTexture && S.ThicknessTextureEnabled && e.setTexture("thicknessSampler", this._thicknessTexture), this._refractionIntensityTexture && S.RefractionIntensityTextureEnabled && s.SS_REFRACTIONINTENSITY_TEXTURE && e.setTexture("refractionIntensitySampler", this._refractionIntensityTexture), this._translucencyIntensityTexture && S.TranslucencyIntensityTextureEnabled && s.SS_TRANSLUCENCYINTENSITY_TEXTURE && e.setTexture("translucencyIntensitySampler", this._translucencyIntensityTexture), f && S.RefractionTextureEnabled && (a ? e.setTexture("refractionSampler", f) : (e.setTexture("refractionSampler", f._lodTextureMid || f), e.setTexture("refractionSamplerLow", f._lodTextureLow || f), e.setTexture("refractionSamplerHigh", f._lodTextureHigh || f))));
  }
  /**
   * Returns the texture used for refraction or null if none is used.
   * @param scene defines the scene the material belongs to.
   * @returns - Refraction texture if present.  If no refraction texture and refraction
   * is linked with transparency, returns environment texture.  Otherwise, returns null.
   */
  _getRefractionTexture(e) {
    return this._refractionTexture ? this._refractionTexture : this._isRefractionEnabled ? e.environmentTexture : null;
  }
  /**
   * Returns true if alpha blending should be disabled.
   */
  get disableAlphaBlending() {
    return this._isRefractionEnabled && this._linkRefractionWithTransparency;
  }
  /**
   * Fills the list of render target textures.
   * @param renderTargets the list of render targets to update
   */
  fillRenderTargetTextures(e) {
    S.RefractionTextureEnabled && this._refractionTexture && this._refractionTexture.isRenderTarget && e.push(this._refractionTexture);
  }
  hasTexture(e) {
    return this._thicknessTexture === e || this._refractionTexture === e;
  }
  hasRenderTargetTextures() {
    return !!(S.RefractionTextureEnabled && this._refractionTexture && this._refractionTexture.isRenderTarget);
  }
  getActiveTextures(e) {
    this._thicknessTexture && e.push(this._thicknessTexture), this._refractionTexture && e.push(this._refractionTexture);
  }
  getAnimatables(e) {
    this._thicknessTexture && this._thicknessTexture.animations && this._thicknessTexture.animations.length > 0 && e.push(this._thicknessTexture), this._refractionTexture && this._refractionTexture.animations && this._refractionTexture.animations.length > 0 && e.push(this._refractionTexture);
  }
  dispose(e) {
    e && (this._thicknessTexture && this._thicknessTexture.dispose(), this._refractionTexture && this._refractionTexture.dispose());
  }
  getClassName() {
    return "PBRSubSurfaceConfiguration";
  }
  addFallbacks(e, t, i) {
    return e.SS_SCATTERING && t.addFallback(i++, "SS_SCATTERING"), e.SS_TRANSLUCENCY && t.addFallback(i++, "SS_TRANSLUCENCY"), i;
  }
  getSamplers(e) {
    e.push("thicknessSampler", "refractionIntensitySampler", "translucencyIntensitySampler", "refractionSampler", "refractionSamplerLow", "refractionSamplerHigh");
  }
  getUniforms() {
    return {
      ubo: [
        { name: "vRefractionMicrosurfaceInfos", size: 4, type: "vec4" },
        { name: "vRefractionFilteringInfo", size: 2, type: "vec2" },
        { name: "vTranslucencyIntensityInfos", size: 2, type: "vec2" },
        { name: "vRefractionInfos", size: 4, type: "vec4" },
        { name: "refractionMatrix", size: 16, type: "mat4" },
        { name: "vThicknessInfos", size: 2, type: "vec2" },
        { name: "vRefractionIntensityInfos", size: 2, type: "vec2" },
        { name: "thicknessMatrix", size: 16, type: "mat4" },
        { name: "refractionIntensityMatrix", size: 16, type: "mat4" },
        { name: "translucencyIntensityMatrix", size: 16, type: "mat4" },
        { name: "vThicknessParam", size: 2, type: "vec2" },
        { name: "vDiffusionDistance", size: 3, type: "vec3" },
        { name: "vTintColor", size: 4, type: "vec4" },
        { name: "vSubSurfaceIntensity", size: 3, type: "vec3" },
        { name: "vRefractionPosition", size: 3, type: "vec3" },
        { name: "vRefractionSize", size: 3, type: "vec3" },
        { name: "scatteringDiffusionProfile", size: 1, type: "float" }
      ]
    };
  }
}
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], J.prototype, "isRefractionEnabled", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], J.prototype, "isTranslucencyEnabled", void 0);
h([
  T(),
  v("_markScenePrePassDirty")
], J.prototype, "isScatteringEnabled", void 0);
h([
  T()
], J.prototype, "_scatteringDiffusionProfileIndex", void 0);
h([
  T()
], J.prototype, "refractionIntensity", void 0);
h([
  T()
], J.prototype, "translucencyIntensity", void 0);
h([
  T()
], J.prototype, "useAlbedoToTintRefraction", void 0);
h([
  T()
], J.prototype, "useAlbedoToTintTranslucency", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], J.prototype, "thicknessTexture", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], J.prototype, "refractionTexture", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], J.prototype, "indexOfRefraction", void 0);
h([
  T()
], J.prototype, "_volumeIndexOfRefraction", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], J.prototype, "volumeIndexOfRefraction", null);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], J.prototype, "invertRefractionY", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], J.prototype, "linkRefractionWithTransparency", void 0);
h([
  T()
], J.prototype, "minimumThickness", void 0);
h([
  T()
], J.prototype, "maximumThickness", void 0);
h([
  T()
], J.prototype, "useThicknessAsDepth", void 0);
h([
  ce()
], J.prototype, "tintColor", void 0);
h([
  T()
], J.prototype, "tintColorAtDistance", void 0);
h([
  ce()
], J.prototype, "diffusionDistance", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], J.prototype, "useMaskFromThicknessTexture", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], J.prototype, "refractionIntensityTexture", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], J.prototype, "translucencyIntensityTexture", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], J.prototype, "useGltfStyleTextures", void 0);
const ot = { effect: null, subMesh: null };
class vi extends ye {
  /**
   * Initializes the PBR Material defines.
   * @param externalProperties The external properties
   */
  constructor(e) {
    super(e), this.PBR = !0, this.NUM_SAMPLES = "0", this.REALTIME_FILTERING = !1, this.MAINUV1 = !1, this.MAINUV2 = !1, this.MAINUV3 = !1, this.MAINUV4 = !1, this.MAINUV5 = !1, this.MAINUV6 = !1, this.UV1 = !1, this.UV2 = !1, this.UV3 = !1, this.UV4 = !1, this.UV5 = !1, this.UV6 = !1, this.ALBEDO = !1, this.GAMMAALBEDO = !1, this.ALBEDODIRECTUV = 0, this.VERTEXCOLOR = !1, this.BAKED_VERTEX_ANIMATION_TEXTURE = !1, this.AMBIENT = !1, this.AMBIENTDIRECTUV = 0, this.AMBIENTINGRAYSCALE = !1, this.OPACITY = !1, this.VERTEXALPHA = !1, this.OPACITYDIRECTUV = 0, this.OPACITYRGB = !1, this.ALPHATEST = !1, this.DEPTHPREPASS = !1, this.ALPHABLEND = !1, this.ALPHAFROMALBEDO = !1, this.ALPHATESTVALUE = "0.5", this.SPECULAROVERALPHA = !1, this.RADIANCEOVERALPHA = !1, this.ALPHAFRESNEL = !1, this.LINEARALPHAFRESNEL = !1, this.PREMULTIPLYALPHA = !1, this.EMISSIVE = !1, this.EMISSIVEDIRECTUV = 0, this.GAMMAEMISSIVE = !1, this.REFLECTIVITY = !1, this.REFLECTIVITY_GAMMA = !1, this.REFLECTIVITYDIRECTUV = 0, this.SPECULARTERM = !1, this.MICROSURFACEFROMREFLECTIVITYMAP = !1, this.MICROSURFACEAUTOMATIC = !1, this.LODBASEDMICROSFURACE = !1, this.MICROSURFACEMAP = !1, this.MICROSURFACEMAPDIRECTUV = 0, this.METALLICWORKFLOW = !1, this.ROUGHNESSSTOREINMETALMAPALPHA = !1, this.ROUGHNESSSTOREINMETALMAPGREEN = !1, this.METALLNESSSTOREINMETALMAPBLUE = !1, this.AOSTOREINMETALMAPRED = !1, this.METALLIC_REFLECTANCE = !1, this.METALLIC_REFLECTANCE_GAMMA = !1, this.METALLIC_REFLECTANCEDIRECTUV = 0, this.METALLIC_REFLECTANCE_USE_ALPHA_ONLY = !1, this.REFLECTANCE = !1, this.REFLECTANCE_GAMMA = !1, this.REFLECTANCEDIRECTUV = 0, this.ENVIRONMENTBRDF = !1, this.ENVIRONMENTBRDF_RGBD = !1, this.NORMAL = !1, this.TANGENT = !1, this.BUMP = !1, this.BUMPDIRECTUV = 0, this.OBJECTSPACE_NORMALMAP = !1, this.PARALLAX = !1, this.PARALLAXOCCLUSION = !1, this.NORMALXYSCALE = !0, this.LIGHTMAP = !1, this.LIGHTMAPDIRECTUV = 0, this.USELIGHTMAPASSHADOWMAP = !1, this.GAMMALIGHTMAP = !1, this.RGBDLIGHTMAP = !1, this.REFLECTION = !1, this.REFLECTIONMAP_3D = !1, this.REFLECTIONMAP_SPHERICAL = !1, this.REFLECTIONMAP_PLANAR = !1, this.REFLECTIONMAP_CUBIC = !1, this.USE_LOCAL_REFLECTIONMAP_CUBIC = !1, this.REFLECTIONMAP_PROJECTION = !1, this.REFLECTIONMAP_SKYBOX = !1, this.REFLECTIONMAP_EXPLICIT = !1, this.REFLECTIONMAP_EQUIRECTANGULAR = !1, this.REFLECTIONMAP_EQUIRECTANGULAR_FIXED = !1, this.REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED = !1, this.INVERTCUBICMAP = !1, this.USESPHERICALFROMREFLECTIONMAP = !1, this.USEIRRADIANCEMAP = !1, this.USESPHERICALINVERTEX = !1, this.REFLECTIONMAP_OPPOSITEZ = !1, this.LODINREFLECTIONALPHA = !1, this.GAMMAREFLECTION = !1, this.RGBDREFLECTION = !1, this.LINEARSPECULARREFLECTION = !1, this.RADIANCEOCCLUSION = !1, this.HORIZONOCCLUSION = !1, this.INSTANCES = !1, this.THIN_INSTANCES = !1, this.INSTANCESCOLOR = !1, this.PREPASS = !1, this.PREPASS_IRRADIANCE = !1, this.PREPASS_IRRADIANCE_INDEX = -1, this.PREPASS_ALBEDO_SQRT = !1, this.PREPASS_ALBEDO_SQRT_INDEX = -1, this.PREPASS_DEPTH = !1, this.PREPASS_DEPTH_INDEX = -1, this.PREPASS_NORMAL = !1, this.PREPASS_NORMAL_INDEX = -1, this.PREPASS_POSITION = !1, this.PREPASS_POSITION_INDEX = -1, this.PREPASS_VELOCITY = !1, this.PREPASS_VELOCITY_INDEX = -1, this.PREPASS_REFLECTIVITY = !1, this.PREPASS_REFLECTIVITY_INDEX = -1, this.SCENE_MRT_COUNT = 0, this.NUM_BONE_INFLUENCERS = 0, this.BonesPerMesh = 0, this.BONETEXTURE = !1, this.BONES_VELOCITY_ENABLED = !1, this.NONUNIFORMSCALING = !1, this.MORPHTARGETS = !1, this.MORPHTARGETS_NORMAL = !1, this.MORPHTARGETS_TANGENT = !1, this.MORPHTARGETS_UV = !1, this.NUM_MORPH_INFLUENCERS = 0, this.MORPHTARGETS_TEXTURE = !1, this.IMAGEPROCESSING = !1, this.VIGNETTE = !1, this.VIGNETTEBLENDMODEMULTIPLY = !1, this.VIGNETTEBLENDMODEOPAQUE = !1, this.TONEMAPPING = !1, this.TONEMAPPING_ACES = !1, this.CONTRAST = !1, this.COLORCURVES = !1, this.COLORGRADING = !1, this.COLORGRADING3D = !1, this.SAMPLER3DGREENDEPTH = !1, this.SAMPLER3DBGRMAP = !1, this.DITHER = !1, this.IMAGEPROCESSINGPOSTPROCESS = !1, this.SKIPFINALCOLORCLAMP = !1, this.EXPOSURE = !1, this.MULTIVIEW = !1, this.ORDER_INDEPENDENT_TRANSPARENCY = !1, this.ORDER_INDEPENDENT_TRANSPARENCY_16BITS = !1, this.USEPHYSICALLIGHTFALLOFF = !1, this.USEGLTFLIGHTFALLOFF = !1, this.TWOSIDEDLIGHTING = !1, this.SHADOWFLOAT = !1, this.CLIPPLANE = !1, this.CLIPPLANE2 = !1, this.CLIPPLANE3 = !1, this.CLIPPLANE4 = !1, this.CLIPPLANE5 = !1, this.CLIPPLANE6 = !1, this.POINTSIZE = !1, this.FOG = !1, this.LOGARITHMICDEPTH = !1, this.CAMERA_ORTHOGRAPHIC = !1, this.CAMERA_PERSPECTIVE = !1, this.FORCENORMALFORWARD = !1, this.SPECULARAA = !1, this.UNLIT = !1, this.DEBUGMODE = 0, this.rebuild();
  }
  /**
   * Resets the PBR Material defines.
   */
  reset() {
    super.reset(), this.ALPHATESTVALUE = "0.5", this.PBR = !0, this.NORMALXYSCALE = !0;
  }
}
class Y extends di {
  /**
   * Enables realtime filtering on the texture.
   */
  get realTimeFiltering() {
    return this._realTimeFiltering;
  }
  set realTimeFiltering(e) {
    this._realTimeFiltering = e, this.markAsDirty(1);
  }
  /**
   * Quality switch for realtime filtering
   */
  get realTimeFilteringQuality() {
    return this._realTimeFilteringQuality;
  }
  set realTimeFilteringQuality(e) {
    this._realTimeFilteringQuality = e, this.markAsDirty(1);
  }
  /**
   * Can this material render to several textures at once
   */
  get canRenderToMRT() {
    return !0;
  }
  /**
   * Attaches a new image processing configuration to the PBR Material.
   * @param configuration
   */
  _attachImageProcessingConfiguration(e) {
    e !== this._imageProcessingConfiguration && (this._imageProcessingConfiguration && this._imageProcessingObserver && this._imageProcessingConfiguration.onUpdateParameters.remove(this._imageProcessingObserver), e ? this._imageProcessingConfiguration = e : this._imageProcessingConfiguration = this.getScene().imageProcessingConfiguration, this._imageProcessingConfiguration && (this._imageProcessingObserver = this._imageProcessingConfiguration.onUpdateParameters.add(() => {
      this._markAllSubMeshesAsImageProcessingDirty();
    })));
  }
  /**
   * Instantiates a new PBRMaterial instance.
   *
   * @param name The material name
   * @param scene The scene the material will be use in.
   */
  constructor(e, t) {
    super(e, t), this._directIntensity = 1, this._emissiveIntensity = 1, this._environmentIntensity = 1, this._specularIntensity = 1, this._lightingInfos = new bi(this._directIntensity, this._emissiveIntensity, this._environmentIntensity, this._specularIntensity), this._disableBumpMap = !1, this._albedoTexture = null, this._ambientTexture = null, this._ambientTextureStrength = 1, this._ambientTextureImpactOnAnalyticalLights = Y.DEFAULT_AO_ON_ANALYTICAL_LIGHTS, this._opacityTexture = null, this._reflectionTexture = null, this._emissiveTexture = null, this._reflectivityTexture = null, this._metallicTexture = null, this._metallic = null, this._roughness = null, this._metallicF0Factor = 1, this._metallicReflectanceColor = K.White(), this._useOnlyMetallicFromMetallicReflectanceTexture = !1, this._metallicReflectanceTexture = null, this._reflectanceTexture = null, this._microSurfaceTexture = null, this._bumpTexture = null, this._lightmapTexture = null, this._ambientColor = new K(0, 0, 0), this._albedoColor = new K(1, 1, 1), this._reflectivityColor = new K(1, 1, 1), this._reflectionColor = new K(1, 1, 1), this._emissiveColor = new K(0, 0, 0), this._microSurface = 0.9, this._useLightmapAsShadowmap = !1, this._useHorizonOcclusion = !0, this._useRadianceOcclusion = !0, this._useAlphaFromAlbedoTexture = !1, this._useSpecularOverAlpha = !0, this._useMicroSurfaceFromReflectivityMapAlpha = !1, this._useRoughnessFromMetallicTextureAlpha = !0, this._useRoughnessFromMetallicTextureGreen = !1, this._useMetallnessFromMetallicTextureBlue = !1, this._useAmbientOcclusionFromMetallicTextureRed = !1, this._useAmbientInGrayScale = !1, this._useAutoMicroSurfaceFromReflectivityMap = !1, this._lightFalloff = Y.LIGHTFALLOFF_PHYSICAL, this._useRadianceOverAlpha = !0, this._useObjectSpaceNormalMap = !1, this._useParallax = !1, this._useParallaxOcclusion = !1, this._parallaxScaleBias = 0.05, this._disableLighting = !1, this._maxSimultaneousLights = 4, this._invertNormalMapX = !1, this._invertNormalMapY = !1, this._twoSidedLighting = !1, this._alphaCutOff = 0.4, this._forceAlphaTest = !1, this._useAlphaFresnel = !1, this._useLinearAlphaFresnel = !1, this._environmentBRDFTexture = null, this._forceIrradianceInFragment = !1, this._realTimeFiltering = !1, this._realTimeFilteringQuality = 8, this._forceNormalForward = !1, this._enableSpecularAntiAliasing = !1, this._imageProcessingObserver = null, this._renderTargets = new yt(16), this._globalAmbientColor = new K(0, 0, 0), this._useLogarithmicDepth = !1, this._unlit = !1, this._debugMode = 0, this.debugMode = 0, this.debugLimit = -1, this.debugFactor = 1, this._cacheHasRenderTargetTextures = !1, this.brdf = new le(this), this.clearCoat = new ae(this), this.iridescence = new _e(this), this.anisotropy = new Pt(this), this.sheen = new Be(this), this.subSurface = new J(this), this.detailMap = new $e(this), this._attachImageProcessingConfiguration(null), this.getRenderTargetTextures = () => (this._renderTargets.reset(), S.ReflectionTextureEnabled && this._reflectionTexture && this._reflectionTexture.isRenderTarget && this._renderTargets.push(this._reflectionTexture), this._eventInfo.renderTargets = this._renderTargets, this._callbackPluginEventFillRenderTargetTextures(this._eventInfo), this._renderTargets), this._environmentBRDFTexture = Gi(this.getScene()), this.prePassConfiguration = new wt();
  }
  /**
   * Gets a boolean indicating that current material needs to register RTT
   */
  get hasRenderTargetTextures() {
    return S.ReflectionTextureEnabled && this._reflectionTexture && this._reflectionTexture.isRenderTarget ? !0 : this._cacheHasRenderTargetTextures;
  }
  /**
   * Can this material render to prepass
   */
  get isPrePassCapable() {
    return !this.disableDepthWrite;
  }
  /**
   * Gets the name of the material class.
   */
  getClassName() {
    return "PBRBaseMaterial";
  }
  /**
   * Enabled the use of logarithmic depth buffers, which is good for wide depth buffers.
   */
  get useLogarithmicDepth() {
    return this._useLogarithmicDepth;
  }
  /**
   * Enabled the use of logarithmic depth buffers, which is good for wide depth buffers.
   */
  set useLogarithmicDepth(e) {
    this._useLogarithmicDepth = e && this.getScene().getEngine().getCaps().fragmentDepthSupported;
  }
  /**
   * Returns true if alpha blending should be disabled.
   */
  get _disableAlphaBlending() {
    var e;
    return this._transparencyMode === Y.PBRMATERIAL_OPAQUE || this._transparencyMode === Y.PBRMATERIAL_ALPHATEST || ((e = this.subSurface) === null || e === void 0 ? void 0 : e.disableAlphaBlending);
  }
  /**
   * Specifies whether or not this material should be rendered in alpha blend mode.
   */
  needAlphaBlending() {
    return this._disableAlphaBlending ? !1 : this.alpha < 1 || this._opacityTexture != null || this._shouldUseAlphaFromAlbedoTexture();
  }
  /**
   * Specifies whether or not this material should be rendered in alpha test mode.
   */
  needAlphaTesting() {
    var e;
    return this._forceAlphaTest ? !0 : !((e = this.subSurface) === null || e === void 0) && e.disableAlphaBlending ? !1 : this._hasAlphaChannel() && (this._transparencyMode == null || this._transparencyMode === Y.PBRMATERIAL_ALPHATEST);
  }
  /**
   * Specifies whether or not the alpha value of the albedo texture should be used for alpha blending.
   */
  _shouldUseAlphaFromAlbedoTexture() {
    return this._albedoTexture != null && this._albedoTexture.hasAlpha && this._useAlphaFromAlbedoTexture && this._transparencyMode !== Y.PBRMATERIAL_OPAQUE;
  }
  /**
   * Specifies whether or not there is a usable alpha channel for transparency.
   */
  _hasAlphaChannel() {
    return this._albedoTexture != null && this._albedoTexture.hasAlpha || this._opacityTexture != null;
  }
  /**
   * Gets the texture used for the alpha test.
   */
  getAlphaTestTexture() {
    return this._albedoTexture;
  }
  /**
   * Specifies that the submesh is ready to be used.
   * @param mesh - BJS mesh.
   * @param subMesh - A submesh of the BJS mesh.  Used to check if it is ready.
   * @param useInstances - Specifies that instances should be used.
   * @returns - boolean indicating that the submesh is ready or not.
   */
  isReadyForSubMesh(e, t, i) {
    if (this._uniformBufferLayoutBuilt || this.buildUniformLayout(), t.effect && this.isFrozen && t.effect._wasPreviouslyReady && t.effect._wasPreviouslyUsingInstances === i)
      return !0;
    t.materialDefines || (this._callbackPluginEventGeneric(Ie.GetDefineNames, this._eventInfo), t.materialDefines = new vi(this._eventInfo.defineNames));
    const r = t.materialDefines;
    if (this._isReadyForSubMesh(t))
      return !0;
    const s = this.getScene(), n = s.getEngine();
    if (r._areTexturesDirty && (this._eventInfo.hasRenderTargetTextures = !1, this._callbackPluginEventHasRenderTargetTextures(this._eventInfo), this._cacheHasRenderTargetTextures = this._eventInfo.hasRenderTargetTextures, s.texturesEnabled)) {
      if (this._albedoTexture && S.DiffuseTextureEnabled && !this._albedoTexture.isReadyOrNotBlocking() || this._ambientTexture && S.AmbientTextureEnabled && !this._ambientTexture.isReadyOrNotBlocking() || this._opacityTexture && S.OpacityTextureEnabled && !this._opacityTexture.isReadyOrNotBlocking())
        return !1;
      const d = this._getReflectionTexture();
      if (d && S.ReflectionTextureEnabled && (!d.isReadyOrNotBlocking() || d.irradianceTexture && !d.irradianceTexture.isReadyOrNotBlocking()) || this._lightmapTexture && S.LightmapTextureEnabled && !this._lightmapTexture.isReadyOrNotBlocking() || this._emissiveTexture && S.EmissiveTextureEnabled && !this._emissiveTexture.isReadyOrNotBlocking())
        return !1;
      if (S.SpecularTextureEnabled) {
        if (this._metallicTexture) {
          if (!this._metallicTexture.isReadyOrNotBlocking())
            return !1;
        } else if (this._reflectivityTexture && !this._reflectivityTexture.isReadyOrNotBlocking())
          return !1;
        if (this._metallicReflectanceTexture && !this._metallicReflectanceTexture.isReadyOrNotBlocking() || this._reflectanceTexture && !this._reflectanceTexture.isReadyOrNotBlocking() || this._microSurfaceTexture && !this._microSurfaceTexture.isReadyOrNotBlocking())
          return !1;
      }
      if (n.getCaps().standardDerivatives && this._bumpTexture && S.BumpTextureEnabled && !this._disableBumpMap && !this._bumpTexture.isReady() || this._environmentBRDFTexture && S.ReflectionTextureEnabled && !this._environmentBRDFTexture.isReady())
        return !1;
    }
    if (this._eventInfo.isReadyForSubMesh = !0, this._eventInfo.defines = r, this._eventInfo.subMesh = t, this._callbackPluginEventIsReadyForSubMesh(this._eventInfo), !this._eventInfo.isReadyForSubMesh || r._areImageProcessingDirty && this._imageProcessingConfiguration && !this._imageProcessingConfiguration.isReady())
      return !1;
    !n.getCaps().standardDerivatives && !e.isVerticesDataPresent(k.NormalKind) && (e.createNormals(!0), pe.Warn("PBRMaterial: Normals have been created for the mesh: " + e.name));
    const o = t.effect, a = r._areLightsDisposed;
    let f = this._prepareEffect(e, r, this.onCompiled, this.onError, i, null, t.getRenderingMesh().hasThinInstances), c = !1;
    if (f)
      if (this._onEffectCreatedObservable && (ot.effect = f, ot.subMesh = t, this._onEffectCreatedObservable.notifyObservers(ot)), this.allowShaderHotSwapping && o && !f.isReady()) {
        if (f = o, r.markAsUnprocessed(), c = this.isFrozen, a)
          return r._areLightsDisposed = !0, !1;
      } else
        s.resetCachedMaterial(), t.setEffect(f, r, this._materialContext);
    return !t.effect || !t.effect.isReady() ? !1 : (r._renderId = s.getRenderId(), t.effect._wasPreviouslyReady = !c, t.effect._wasPreviouslyUsingInstances = !!i, this._checkScenePerformancePriority(), !0);
  }
  /**
   * Specifies if the material uses metallic roughness workflow.
   * @returns boolean specifying if the material uses metallic roughness workflow.
   */
  isMetallicWorkflow() {
    return !!(this._metallic != null || this._roughness != null || this._metallicTexture);
  }
  _prepareEffect(e, t, i = null, r = null, s = null, n = null, o) {
    if (this._prepareDefines(e, t, s, n, o), !t.isDirty)
      return null;
    t.markAsProcessed();
    const f = this.getScene().getEngine(), c = new Ht();
    let d = 0;
    t.USESPHERICALINVERTEX && c.addFallback(d++, "USESPHERICALINVERTEX"), t.FOG && c.addFallback(d, "FOG"), t.SPECULARAA && c.addFallback(d, "SPECULARAA"), t.POINTSIZE && c.addFallback(d, "POINTSIZE"), t.LOGARITHMICDEPTH && c.addFallback(d, "LOGARITHMICDEPTH"), t.PARALLAX && c.addFallback(d, "PARALLAX"), t.PARALLAXOCCLUSION && c.addFallback(d++, "PARALLAXOCCLUSION"), t.ENVIRONMENTBRDF && c.addFallback(d++, "ENVIRONMENTBRDF"), t.TANGENT && c.addFallback(d++, "TANGENT"), t.BUMP && c.addFallback(d++, "BUMP"), d = M.HandleFallbacksForShadows(t, c, this._maxSimultaneousLights, d++), t.SPECULARTERM && c.addFallback(d++, "SPECULARTERM"), t.USESPHERICALFROMREFLECTIONMAP && c.addFallback(d++, "USESPHERICALFROMREFLECTIONMAP"), t.USEIRRADIANCEMAP && c.addFallback(d++, "USEIRRADIANCEMAP"), t.LIGHTMAP && c.addFallback(d++, "LIGHTMAP"), t.NORMAL && c.addFallback(d++, "NORMAL"), t.AMBIENT && c.addFallback(d++, "AMBIENT"), t.EMISSIVE && c.addFallback(d++, "EMISSIVE"), t.VERTEXCOLOR && c.addFallback(d++, "VERTEXCOLOR"), t.MORPHTARGETS && c.addFallback(d++, "MORPHTARGETS"), t.MULTIVIEW && c.addFallback(0, "MULTIVIEW");
    const E = [k.PositionKind];
    t.NORMAL && E.push(k.NormalKind), t.TANGENT && E.push(k.TangentKind);
    for (let L = 1; L <= 6; ++L)
      t["UV" + L] && E.push(`uv${L === 1 ? "" : L}`);
    t.VERTEXCOLOR && E.push(k.ColorKind), t.INSTANCESCOLOR && E.push(k.ColorInstanceKind), M.PrepareAttributesForBones(E, e, t, c), M.PrepareAttributesForInstances(E, t), M.PrepareAttributesForMorphTargets(E, e, t), M.PrepareAttributesForBakedVertexAnimation(E, e, t);
    let u = "pbr";
    const _ = [
      "world",
      "view",
      "viewProjection",
      "vEyePosition",
      "vLightsType",
      "vAmbientColor",
      "vAlbedoColor",
      "vReflectivityColor",
      "vMetallicReflectanceFactors",
      "vEmissiveColor",
      "visibility",
      "vReflectionColor",
      "vFogInfos",
      "vFogColor",
      "pointSize",
      "vAlbedoInfos",
      "vAmbientInfos",
      "vOpacityInfos",
      "vReflectionInfos",
      "vReflectionPosition",
      "vReflectionSize",
      "vEmissiveInfos",
      "vReflectivityInfos",
      "vReflectionFilteringInfo",
      "vMetallicReflectanceInfos",
      "vReflectanceInfos",
      "vMicroSurfaceSamplerInfos",
      "vBumpInfos",
      "vLightmapInfos",
      "mBones",
      "albedoMatrix",
      "ambientMatrix",
      "opacityMatrix",
      "reflectionMatrix",
      "emissiveMatrix",
      "reflectivityMatrix",
      "normalMatrix",
      "microSurfaceSamplerMatrix",
      "bumpMatrix",
      "lightmapMatrix",
      "metallicReflectanceMatrix",
      "reflectanceMatrix",
      "vLightingIntensity",
      "logarithmicDepthConstant",
      "vSphericalX",
      "vSphericalY",
      "vSphericalZ",
      "vSphericalXX_ZZ",
      "vSphericalYY_ZZ",
      "vSphericalZZ",
      "vSphericalXY",
      "vSphericalYZ",
      "vSphericalZX",
      "vSphericalL00",
      "vSphericalL1_1",
      "vSphericalL10",
      "vSphericalL11",
      "vSphericalL2_2",
      "vSphericalL2_1",
      "vSphericalL20",
      "vSphericalL21",
      "vSphericalL22",
      "vReflectionMicrosurfaceInfos",
      "vTangentSpaceParams",
      "boneTextureWidth",
      "vDebugMode",
      "morphTargetTextureInfo",
      "morphTargetTextureIndices"
    ], p = [
      "albedoSampler",
      "reflectivitySampler",
      "ambientSampler",
      "emissiveSampler",
      "bumpSampler",
      "lightmapSampler",
      "opacitySampler",
      "reflectionSampler",
      "reflectionSamplerLow",
      "reflectionSamplerHigh",
      "irradianceSampler",
      "microSurfaceSampler",
      "environmentBrdfSampler",
      "boneSampler",
      "metallicReflectanceSampler",
      "reflectanceSampler",
      "morphTargets",
      "oitDepthSampler",
      "oitFrontColorSampler"
    ], A = ["Material", "Scene", "Mesh"];
    this._eventInfo.fallbacks = c, this._eventInfo.fallbackRank = d, this._eventInfo.defines = t, this._eventInfo.uniforms = _, this._eventInfo.attributes = E, this._eventInfo.samplers = p, this._eventInfo.uniformBuffersNames = A, this._eventInfo.customCode = void 0, this._eventInfo.mesh = e, this._callbackPluginEventGeneric(Ie.PrepareEffect, this._eventInfo), wt.AddUniforms(_), Ot(_), ct && (ct.PrepareUniforms(_, t), ct.PrepareSamplers(p, t)), M.PrepareUniformsAndSamplersList({
      uniformsNames: _,
      uniformBuffersNames: A,
      samplers: p,
      defines: t,
      maxSimultaneousLights: this._maxSimultaneousLights
    });
    const R = {};
    this.customShaderNameResolve && (u = this.customShaderNameResolve(u, _, A, p, t, E, R));
    const N = t.toString(), O = f.createEffect(u, {
      attributes: E,
      uniformsNames: _,
      uniformBuffersNames: A,
      samplers: p,
      defines: N,
      fallbacks: c,
      onCompiled: i,
      onError: r,
      indexParameters: { maxSimultaneousLights: this._maxSimultaneousLights, maxSimultaneousMorphTargets: t.NUM_MORPH_INFLUENCERS },
      processFinalCode: R.processFinalCode,
      processCodeAfterIncludes: this._eventInfo.customCode,
      multiTarget: t.PREPASS
    }, f);
    return this._eventInfo.customCode = void 0, O;
  }
  _prepareDefines(e, t, i = null, r = null, s = !1) {
    var n;
    const o = this.getScene(), a = o.getEngine();
    M.PrepareDefinesForLights(o, e, t, !0, this._maxSimultaneousLights, this._disableLighting), t._needNormals = !0, M.PrepareDefinesForMultiview(o, t);
    const f = this.needAlphaBlendingForMesh(e) && this.getScene().useOrderIndependentTransparency;
    if (M.PrepareDefinesForPrePass(o, t, this.canRenderToMRT && !f), M.PrepareDefinesForOIT(o, t, f), t.METALLICWORKFLOW = this.isMetallicWorkflow(), t._areTexturesDirty) {
      t._needUVs = !1;
      for (let c = 1; c <= 6; ++c)
        t["MAINUV" + c] = !1;
      if (o.texturesEnabled) {
        t.ALBEDODIRECTUV = 0, t.AMBIENTDIRECTUV = 0, t.OPACITYDIRECTUV = 0, t.EMISSIVEDIRECTUV = 0, t.REFLECTIVITYDIRECTUV = 0, t.MICROSURFACEMAPDIRECTUV = 0, t.METALLIC_REFLECTANCEDIRECTUV = 0, t.REFLECTANCEDIRECTUV = 0, t.BUMPDIRECTUV = 0, t.LIGHTMAPDIRECTUV = 0, a.getCaps().textureLOD && (t.LODBASEDMICROSFURACE = !0), this._albedoTexture && S.DiffuseTextureEnabled ? (M.PrepareDefinesForMergedUV(this._albedoTexture, t, "ALBEDO"), t.GAMMAALBEDO = this._albedoTexture.gammaSpace) : t.ALBEDO = !1, this._ambientTexture && S.AmbientTextureEnabled ? (M.PrepareDefinesForMergedUV(this._ambientTexture, t, "AMBIENT"), t.AMBIENTINGRAYSCALE = this._useAmbientInGrayScale) : t.AMBIENT = !1, this._opacityTexture && S.OpacityTextureEnabled ? (M.PrepareDefinesForMergedUV(this._opacityTexture, t, "OPACITY"), t.OPACITYRGB = this._opacityTexture.getAlphaFromRGB) : t.OPACITY = !1;
        const c = this._getReflectionTexture();
        if (c && S.ReflectionTextureEnabled) {
          switch (t.REFLECTION = !0, t.GAMMAREFLECTION = c.gammaSpace, t.RGBDREFLECTION = c.isRGBD, t.LODINREFLECTIONALPHA = c.lodLevelInAlpha, t.LINEARSPECULARREFLECTION = c.linearSpecularLOD, this.realTimeFiltering && this.realTimeFilteringQuality > 0 ? (t.NUM_SAMPLES = "" + this.realTimeFilteringQuality, a._features.needTypeSuffixInShaderConstants && (t.NUM_SAMPLES = t.NUM_SAMPLES + "u"), t.REALTIME_FILTERING = !0) : t.REALTIME_FILTERING = !1, t.INVERTCUBICMAP = c.coordinatesMode === I.INVCUBIC_MODE, t.REFLECTIONMAP_3D = c.isCube, t.REFLECTIONMAP_OPPOSITEZ = t.REFLECTIONMAP_3D && this.getScene().useRightHandedSystem ? !c.invertZ : c.invertZ, t.REFLECTIONMAP_CUBIC = !1, t.REFLECTIONMAP_EXPLICIT = !1, t.REFLECTIONMAP_PLANAR = !1, t.REFLECTIONMAP_PROJECTION = !1, t.REFLECTIONMAP_SKYBOX = !1, t.REFLECTIONMAP_SPHERICAL = !1, t.REFLECTIONMAP_EQUIRECTANGULAR = !1, t.REFLECTIONMAP_EQUIRECTANGULAR_FIXED = !1, t.REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED = !1, c.coordinatesMode) {
            case I.EXPLICIT_MODE:
              t.REFLECTIONMAP_EXPLICIT = !0;
              break;
            case I.PLANAR_MODE:
              t.REFLECTIONMAP_PLANAR = !0;
              break;
            case I.PROJECTION_MODE:
              t.REFLECTIONMAP_PROJECTION = !0;
              break;
            case I.SKYBOX_MODE:
              t.REFLECTIONMAP_SKYBOX = !0;
              break;
            case I.SPHERICAL_MODE:
              t.REFLECTIONMAP_SPHERICAL = !0;
              break;
            case I.EQUIRECTANGULAR_MODE:
              t.REFLECTIONMAP_EQUIRECTANGULAR = !0;
              break;
            case I.FIXED_EQUIRECTANGULAR_MODE:
              t.REFLECTIONMAP_EQUIRECTANGULAR_FIXED = !0;
              break;
            case I.FIXED_EQUIRECTANGULAR_MIRRORED_MODE:
              t.REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED = !0;
              break;
            case I.CUBIC_MODE:
            case I.INVCUBIC_MODE:
            default:
              t.REFLECTIONMAP_CUBIC = !0, t.USE_LOCAL_REFLECTIONMAP_CUBIC = !!c.boundingBoxSize;
              break;
          }
          c.coordinatesMode !== I.SKYBOX_MODE && (c.irradianceTexture ? (t.USEIRRADIANCEMAP = !0, t.USESPHERICALFROMREFLECTIONMAP = !1) : c.isCube && (t.USESPHERICALFROMREFLECTIONMAP = !0, t.USEIRRADIANCEMAP = !1, this._forceIrradianceInFragment || this.realTimeFiltering || a.getCaps().maxVaryingVectors <= 8 ? t.USESPHERICALINVERTEX = !1 : t.USESPHERICALINVERTEX = !0));
        } else
          t.REFLECTION = !1, t.REFLECTIONMAP_3D = !1, t.REFLECTIONMAP_SPHERICAL = !1, t.REFLECTIONMAP_PLANAR = !1, t.REFLECTIONMAP_CUBIC = !1, t.USE_LOCAL_REFLECTIONMAP_CUBIC = !1, t.REFLECTIONMAP_PROJECTION = !1, t.REFLECTIONMAP_SKYBOX = !1, t.REFLECTIONMAP_EXPLICIT = !1, t.REFLECTIONMAP_EQUIRECTANGULAR = !1, t.REFLECTIONMAP_EQUIRECTANGULAR_FIXED = !1, t.REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED = !1, t.INVERTCUBICMAP = !1, t.USESPHERICALFROMREFLECTIONMAP = !1, t.USEIRRADIANCEMAP = !1, t.USESPHERICALINVERTEX = !1, t.REFLECTIONMAP_OPPOSITEZ = !1, t.LODINREFLECTIONALPHA = !1, t.GAMMAREFLECTION = !1, t.RGBDREFLECTION = !1, t.LINEARSPECULARREFLECTION = !1;
        if (this._lightmapTexture && S.LightmapTextureEnabled ? (M.PrepareDefinesForMergedUV(this._lightmapTexture, t, "LIGHTMAP"), t.USELIGHTMAPASSHADOWMAP = this._useLightmapAsShadowmap, t.GAMMALIGHTMAP = this._lightmapTexture.gammaSpace, t.RGBDLIGHTMAP = this._lightmapTexture.isRGBD) : t.LIGHTMAP = !1, this._emissiveTexture && S.EmissiveTextureEnabled ? (M.PrepareDefinesForMergedUV(this._emissiveTexture, t, "EMISSIVE"), t.GAMMAEMISSIVE = this._emissiveTexture.gammaSpace) : t.EMISSIVE = !1, S.SpecularTextureEnabled) {
          if (this._metallicTexture ? (M.PrepareDefinesForMergedUV(this._metallicTexture, t, "REFLECTIVITY"), t.ROUGHNESSSTOREINMETALMAPALPHA = this._useRoughnessFromMetallicTextureAlpha, t.ROUGHNESSSTOREINMETALMAPGREEN = !this._useRoughnessFromMetallicTextureAlpha && this._useRoughnessFromMetallicTextureGreen, t.METALLNESSSTOREINMETALMAPBLUE = this._useMetallnessFromMetallicTextureBlue, t.AOSTOREINMETALMAPRED = this._useAmbientOcclusionFromMetallicTextureRed, t.REFLECTIVITY_GAMMA = !1) : this._reflectivityTexture ? (M.PrepareDefinesForMergedUV(this._reflectivityTexture, t, "REFLECTIVITY"), t.MICROSURFACEFROMREFLECTIVITYMAP = this._useMicroSurfaceFromReflectivityMapAlpha, t.MICROSURFACEAUTOMATIC = this._useAutoMicroSurfaceFromReflectivityMap, t.REFLECTIVITY_GAMMA = this._reflectivityTexture.gammaSpace) : t.REFLECTIVITY = !1, this._metallicReflectanceTexture || this._reflectanceTexture) {
            const d = this._metallicReflectanceTexture !== null && this._metallicReflectanceTexture._texture === ((n = this._reflectanceTexture) === null || n === void 0 ? void 0 : n._texture) && this._metallicReflectanceTexture.checkTransformsAreIdentical(this._reflectanceTexture);
            t.METALLIC_REFLECTANCE_USE_ALPHA_ONLY = this._useOnlyMetallicFromMetallicReflectanceTexture && !d, this._metallicReflectanceTexture ? (M.PrepareDefinesForMergedUV(this._metallicReflectanceTexture, t, "METALLIC_REFLECTANCE"), t.METALLIC_REFLECTANCE_GAMMA = this._metallicReflectanceTexture.gammaSpace) : t.METALLIC_REFLECTANCE = !1, this._reflectanceTexture && !d && (!this._metallicReflectanceTexture || this._metallicReflectanceTexture && this._useOnlyMetallicFromMetallicReflectanceTexture) ? (M.PrepareDefinesForMergedUV(this._reflectanceTexture, t, "REFLECTANCE"), t.REFLECTANCE_GAMMA = this._reflectanceTexture.gammaSpace) : t.REFLECTANCE = !1;
          } else
            t.METALLIC_REFLECTANCE = !1, t.REFLECTANCE = !1;
          this._microSurfaceTexture ? M.PrepareDefinesForMergedUV(this._microSurfaceTexture, t, "MICROSURFACEMAP") : t.MICROSURFACEMAP = !1;
        } else
          t.REFLECTIVITY = !1, t.MICROSURFACEMAP = !1;
        a.getCaps().standardDerivatives && this._bumpTexture && S.BumpTextureEnabled && !this._disableBumpMap ? (M.PrepareDefinesForMergedUV(this._bumpTexture, t, "BUMP"), this._useParallax && this._albedoTexture && S.DiffuseTextureEnabled ? (t.PARALLAX = !0, t.PARALLAXOCCLUSION = !!this._useParallaxOcclusion) : t.PARALLAX = !1, t.OBJECTSPACE_NORMALMAP = this._useObjectSpaceNormalMap) : (t.BUMP = !1, t.PARALLAX = !1, t.PARALLAXOCCLUSION = !1, t.OBJECTSPACE_NORMALMAP = !1), this._environmentBRDFTexture && S.ReflectionTextureEnabled ? (t.ENVIRONMENTBRDF = !0, t.ENVIRONMENTBRDF_RGBD = this._environmentBRDFTexture.isRGBD) : (t.ENVIRONMENTBRDF = !1, t.ENVIRONMENTBRDF_RGBD = !1), this._shouldUseAlphaFromAlbedoTexture() ? t.ALPHAFROMALBEDO = !0 : t.ALPHAFROMALBEDO = !1;
      }
      t.SPECULAROVERALPHA = this._useSpecularOverAlpha, this._lightFalloff === Y.LIGHTFALLOFF_STANDARD ? (t.USEPHYSICALLIGHTFALLOFF = !1, t.USEGLTFLIGHTFALLOFF = !1) : this._lightFalloff === Y.LIGHTFALLOFF_GLTF ? (t.USEPHYSICALLIGHTFALLOFF = !1, t.USEGLTFLIGHTFALLOFF = !0) : (t.USEPHYSICALLIGHTFALLOFF = !0, t.USEGLTFLIGHTFALLOFF = !1), t.RADIANCEOVERALPHA = this._useRadianceOverAlpha, !this.backFaceCulling && this._twoSidedLighting ? t.TWOSIDEDLIGHTING = !0 : t.TWOSIDEDLIGHTING = !1, t.SPECULARAA = a.getCaps().standardDerivatives && this._enableSpecularAntiAliasing;
    }
    (t._areTexturesDirty || t._areMiscDirty) && (t.ALPHATESTVALUE = `${this._alphaCutOff}${this._alphaCutOff % 1 === 0 ? "." : ""}`, t.PREMULTIPLYALPHA = this.alphaMode === 7 || this.alphaMode === 8, t.ALPHABLEND = this.needAlphaBlendingForMesh(e), t.ALPHAFRESNEL = this._useAlphaFresnel || this._useLinearAlphaFresnel, t.LINEARALPHAFRESNEL = this._useLinearAlphaFresnel), t._areImageProcessingDirty && this._imageProcessingConfiguration && this._imageProcessingConfiguration.prepareDefines(t), t.FORCENORMALFORWARD = this._forceNormalForward, t.RADIANCEOCCLUSION = this._useRadianceOcclusion, t.HORIZONOCCLUSION = this._useHorizonOcclusion, t._areMiscDirty && (M.PrepareDefinesForMisc(e, o, this._useLogarithmicDepth, this.pointsCloud, this.fogEnabled, this._shouldTurnAlphaTestOn(e) || this._forceAlphaTest, t), t.UNLIT = this._unlit || (this.pointsCloud || this.wireframe) && !e.isVerticesDataPresent(k.NormalKind), t.DEBUGMODE = this._debugMode), M.PrepareDefinesForFrameBoundValues(o, a, this, t, !!i, r, s), this._eventInfo.defines = t, this._eventInfo.mesh = e, this._callbackPluginEventPrepareDefinesBeforeAttributes(this._eventInfo), M.PrepareDefinesForAttributes(e, t, !0, !0, !0, this._transparencyMode !== Y.PBRMATERIAL_OPAQUE), this._callbackPluginEventPrepareDefines(this._eventInfo);
  }
  /**
   * Force shader compilation
   * @param mesh
   * @param onCompiled
   * @param options
   */
  forceCompilation(e, t, i) {
    const r = {
      clipPlane: !1,
      useInstances: !1,
      ...i
    };
    this._uniformBufferLayoutBuilt || this.buildUniformLayout(), this._callbackPluginEventGeneric(Ie.GetDefineNames, this._eventInfo);
    const s = new vi(this._eventInfo.defineNames), n = this._prepareEffect(e, s, void 0, void 0, r.useInstances, r.clipPlane, e.hasThinInstances);
    this._onEffectCreatedObservable && (ot.effect = n, ot.subMesh = null, this._onEffectCreatedObservable.notifyObservers(ot)), n.isReady() ? t && t(this) : n.onCompileObservable.add(() => {
      t && t(this);
    });
  }
  /**
   * Initializes the uniform buffer layout for the shader.
   */
  buildUniformLayout() {
    const e = this._uniformBuffer;
    e.addUniform("vAlbedoInfos", 2), e.addUniform("vAmbientInfos", 4), e.addUniform("vOpacityInfos", 2), e.addUniform("vEmissiveInfos", 2), e.addUniform("vLightmapInfos", 2), e.addUniform("vReflectivityInfos", 3), e.addUniform("vMicroSurfaceSamplerInfos", 2), e.addUniform("vReflectionInfos", 2), e.addUniform("vReflectionFilteringInfo", 2), e.addUniform("vReflectionPosition", 3), e.addUniform("vReflectionSize", 3), e.addUniform("vBumpInfos", 3), e.addUniform("albedoMatrix", 16), e.addUniform("ambientMatrix", 16), e.addUniform("opacityMatrix", 16), e.addUniform("emissiveMatrix", 16), e.addUniform("lightmapMatrix", 16), e.addUniform("reflectivityMatrix", 16), e.addUniform("microSurfaceSamplerMatrix", 16), e.addUniform("bumpMatrix", 16), e.addUniform("vTangentSpaceParams", 2), e.addUniform("reflectionMatrix", 16), e.addUniform("vReflectionColor", 3), e.addUniform("vAlbedoColor", 4), e.addUniform("vLightingIntensity", 4), e.addUniform("vReflectionMicrosurfaceInfos", 3), e.addUniform("pointSize", 1), e.addUniform("vReflectivityColor", 4), e.addUniform("vEmissiveColor", 3), e.addUniform("vAmbientColor", 3), e.addUniform("vDebugMode", 2), e.addUniform("vMetallicReflectanceFactors", 4), e.addUniform("vMetallicReflectanceInfos", 2), e.addUniform("metallicReflectanceMatrix", 16), e.addUniform("vReflectanceInfos", 2), e.addUniform("reflectanceMatrix", 16), e.addUniform("vSphericalL00", 3), e.addUniform("vSphericalL1_1", 3), e.addUniform("vSphericalL10", 3), e.addUniform("vSphericalL11", 3), e.addUniform("vSphericalL2_2", 3), e.addUniform("vSphericalL2_1", 3), e.addUniform("vSphericalL20", 3), e.addUniform("vSphericalL21", 3), e.addUniform("vSphericalL22", 3), e.addUniform("vSphericalX", 3), e.addUniform("vSphericalY", 3), e.addUniform("vSphericalZ", 3), e.addUniform("vSphericalXX_ZZ", 3), e.addUniform("vSphericalYY_ZZ", 3), e.addUniform("vSphericalZZ", 3), e.addUniform("vSphericalXY", 3), e.addUniform("vSphericalYZ", 3), e.addUniform("vSphericalZX", 3), super.buildUniformLayout();
  }
  /**
   * Binds the submesh data.
   * @param world - The world matrix.
   * @param mesh - The BJS mesh.
   * @param subMesh - A submesh of the BJS mesh.
   */
  bindForSubMesh(e, t, i) {
    var r, s, n, o;
    const a = this.getScene(), f = i.materialDefines;
    if (!f)
      return;
    const c = i.effect;
    if (!c)
      return;
    this._activeEffect = c, t.getMeshUniformBuffer().bindToEffect(c, "Mesh"), t.transferToEffect(e);
    const d = a.getEngine();
    this._uniformBuffer.bindToEffect(c, "Material"), this.prePassConfiguration.bindForSubMesh(this._activeEffect, a, t, e, this.isFrozen), this._eventInfo.subMesh = i, this._callbackPluginEventHardBindForSubMesh(this._eventInfo), f.OBJECTSPACE_NORMALMAP && (e.toNormalMatrix(this._normalMatrix), this.bindOnlyNormalMatrix(this._normalMatrix));
    const E = c._forceRebindOnNextCall || this._mustRebind(a, c, t.visibility);
    M.BindBonesParameters(t, this._activeEffect, this.prePassConfiguration);
    let u = null;
    const _ = this._uniformBuffer;
    if (E) {
      if (this.bindViewProjection(c), u = this._getReflectionTexture(), !_.useUbo || !this.isFrozen || !_.isSync || c._forceRebindOnNextCall) {
        if (a.texturesEnabled) {
          if (this._albedoTexture && S.DiffuseTextureEnabled && (_.updateFloat2("vAlbedoInfos", this._albedoTexture.coordinatesIndex, this._albedoTexture.level), M.BindTextureMatrix(this._albedoTexture, _, "albedo")), this._ambientTexture && S.AmbientTextureEnabled && (_.updateFloat4("vAmbientInfos", this._ambientTexture.coordinatesIndex, this._ambientTexture.level, this._ambientTextureStrength, this._ambientTextureImpactOnAnalyticalLights), M.BindTextureMatrix(this._ambientTexture, _, "ambient")), this._opacityTexture && S.OpacityTextureEnabled && (_.updateFloat2("vOpacityInfos", this._opacityTexture.coordinatesIndex, this._opacityTexture.level), M.BindTextureMatrix(this._opacityTexture, _, "opacity")), u && S.ReflectionTextureEnabled) {
            if (_.updateMatrix("reflectionMatrix", u.getReflectionTextureMatrix()), _.updateFloat2("vReflectionInfos", u.level, 0), u.boundingBoxSize) {
              const p = u;
              _.updateVector3("vReflectionPosition", p.boundingBoxPosition), _.updateVector3("vReflectionSize", p.boundingBoxSize);
            }
            if (this.realTimeFiltering) {
              const p = u.getSize().width;
              _.updateFloat2("vReflectionFilteringInfo", p, be.Log2(p));
            }
            if (!f.USEIRRADIANCEMAP) {
              const p = u.sphericalPolynomial;
              if (f.USESPHERICALFROMREFLECTIONMAP && p)
                if (f.SPHERICAL_HARMONICS) {
                  const A = p.preScaledHarmonics;
                  _.updateVector3("vSphericalL00", A.l00), _.updateVector3("vSphericalL1_1", A.l1_1), _.updateVector3("vSphericalL10", A.l10), _.updateVector3("vSphericalL11", A.l11), _.updateVector3("vSphericalL2_2", A.l2_2), _.updateVector3("vSphericalL2_1", A.l2_1), _.updateVector3("vSphericalL20", A.l20), _.updateVector3("vSphericalL21", A.l21), _.updateVector3("vSphericalL22", A.l22);
                } else
                  _.updateFloat3("vSphericalX", p.x.x, p.x.y, p.x.z), _.updateFloat3("vSphericalY", p.y.x, p.y.y, p.y.z), _.updateFloat3("vSphericalZ", p.z.x, p.z.y, p.z.z), _.updateFloat3("vSphericalXX_ZZ", p.xx.x - p.zz.x, p.xx.y - p.zz.y, p.xx.z - p.zz.z), _.updateFloat3("vSphericalYY_ZZ", p.yy.x - p.zz.x, p.yy.y - p.zz.y, p.yy.z - p.zz.z), _.updateFloat3("vSphericalZZ", p.zz.x, p.zz.y, p.zz.z), _.updateFloat3("vSphericalXY", p.xy.x, p.xy.y, p.xy.z), _.updateFloat3("vSphericalYZ", p.yz.x, p.yz.y, p.yz.z), _.updateFloat3("vSphericalZX", p.zx.x, p.zx.y, p.zx.z);
            }
            _.updateFloat3("vReflectionMicrosurfaceInfos", u.getSize().width, u.lodGenerationScale, u.lodGenerationOffset);
          }
          this._emissiveTexture && S.EmissiveTextureEnabled && (_.updateFloat2("vEmissiveInfos", this._emissiveTexture.coordinatesIndex, this._emissiveTexture.level), M.BindTextureMatrix(this._emissiveTexture, _, "emissive")), this._lightmapTexture && S.LightmapTextureEnabled && (_.updateFloat2("vLightmapInfos", this._lightmapTexture.coordinatesIndex, this._lightmapTexture.level), M.BindTextureMatrix(this._lightmapTexture, _, "lightmap")), S.SpecularTextureEnabled && (this._metallicTexture ? (_.updateFloat3("vReflectivityInfos", this._metallicTexture.coordinatesIndex, this._metallicTexture.level, this._ambientTextureStrength), M.BindTextureMatrix(this._metallicTexture, _, "reflectivity")) : this._reflectivityTexture && (_.updateFloat3("vReflectivityInfos", this._reflectivityTexture.coordinatesIndex, this._reflectivityTexture.level, 1), M.BindTextureMatrix(this._reflectivityTexture, _, "reflectivity")), this._metallicReflectanceTexture && (_.updateFloat2("vMetallicReflectanceInfos", this._metallicReflectanceTexture.coordinatesIndex, this._metallicReflectanceTexture.level), M.BindTextureMatrix(this._metallicReflectanceTexture, _, "metallicReflectance")), this._reflectanceTexture && f.REFLECTANCE && (_.updateFloat2("vReflectanceInfos", this._reflectanceTexture.coordinatesIndex, this._reflectanceTexture.level), M.BindTextureMatrix(this._reflectanceTexture, _, "reflectance")), this._microSurfaceTexture && (_.updateFloat2("vMicroSurfaceSamplerInfos", this._microSurfaceTexture.coordinatesIndex, this._microSurfaceTexture.level), M.BindTextureMatrix(this._microSurfaceTexture, _, "microSurfaceSampler"))), this._bumpTexture && d.getCaps().standardDerivatives && S.BumpTextureEnabled && !this._disableBumpMap && (_.updateFloat3("vBumpInfos", this._bumpTexture.coordinatesIndex, this._bumpTexture.level, this._parallaxScaleBias), M.BindTextureMatrix(this._bumpTexture, _, "bump"), a._mirroredCameraPosition ? _.updateFloat2("vTangentSpaceParams", this._invertNormalMapX ? 1 : -1, this._invertNormalMapY ? 1 : -1) : _.updateFloat2("vTangentSpaceParams", this._invertNormalMapX ? -1 : 1, this._invertNormalMapY ? -1 : 1));
        }
        if (this.pointsCloud && _.updateFloat("pointSize", this.pointSize), f.METALLICWORKFLOW) {
          ke.Color3[0].r = this._metallic === void 0 || this._metallic === null ? 1 : this._metallic, ke.Color3[0].g = this._roughness === void 0 || this._roughness === null ? 1 : this._roughness, _.updateColor4("vReflectivityColor", ke.Color3[0], 1);
          const p = (s = (r = this.subSurface) === null || r === void 0 ? void 0 : r._indexOfRefraction) !== null && s !== void 0 ? s : 1.5, A = 1, R = Math.pow((p - A) / (p + A), 2);
          this._metallicReflectanceColor.scaleToRef(R * this._metallicF0Factor, ke.Color3[0]);
          const N = this._metallicF0Factor;
          _.updateColor4("vMetallicReflectanceFactors", ke.Color3[0], N);
        } else
          _.updateColor4("vReflectivityColor", this._reflectivityColor, this._microSurface);
        _.updateColor3("vEmissiveColor", S.EmissiveTextureEnabled ? this._emissiveColor : K.BlackReadOnly), _.updateColor3("vReflectionColor", this._reflectionColor), !f.SS_REFRACTION && (!((n = this.subSurface) === null || n === void 0) && n._linkRefractionWithTransparency) ? _.updateColor4("vAlbedoColor", this._albedoColor, 1) : _.updateColor4("vAlbedoColor", this._albedoColor, this.alpha), this._lightingInfos.x = this._directIntensity, this._lightingInfos.y = this._emissiveIntensity, this._lightingInfos.z = this._environmentIntensity * a.environmentIntensity, this._lightingInfos.w = this._specularIntensity, _.updateVector4("vLightingIntensity", this._lightingInfos), a.ambientColor.multiplyToRef(this._ambientColor, this._globalAmbientColor), _.updateColor3("vAmbientColor", this._globalAmbientColor), _.updateFloat2("vDebugMode", this.debugLimit, this.debugFactor);
      }
      a.texturesEnabled && (this._albedoTexture && S.DiffuseTextureEnabled && _.setTexture("albedoSampler", this._albedoTexture), this._ambientTexture && S.AmbientTextureEnabled && _.setTexture("ambientSampler", this._ambientTexture), this._opacityTexture && S.OpacityTextureEnabled && _.setTexture("opacitySampler", this._opacityTexture), u && S.ReflectionTextureEnabled && (f.LODBASEDMICROSFURACE ? _.setTexture("reflectionSampler", u) : (_.setTexture("reflectionSampler", u._lodTextureMid || u), _.setTexture("reflectionSamplerLow", u._lodTextureLow || u), _.setTexture("reflectionSamplerHigh", u._lodTextureHigh || u)), f.USEIRRADIANCEMAP && _.setTexture("irradianceSampler", u.irradianceTexture)), f.ENVIRONMENTBRDF && _.setTexture("environmentBrdfSampler", this._environmentBRDFTexture), this._emissiveTexture && S.EmissiveTextureEnabled && _.setTexture("emissiveSampler", this._emissiveTexture), this._lightmapTexture && S.LightmapTextureEnabled && _.setTexture("lightmapSampler", this._lightmapTexture), S.SpecularTextureEnabled && (this._metallicTexture ? _.setTexture("reflectivitySampler", this._metallicTexture) : this._reflectivityTexture && _.setTexture("reflectivitySampler", this._reflectivityTexture), this._metallicReflectanceTexture && _.setTexture("metallicReflectanceSampler", this._metallicReflectanceTexture), this._reflectanceTexture && f.REFLECTANCE && _.setTexture("reflectanceSampler", this._reflectanceTexture), this._microSurfaceTexture && _.setTexture("microSurfaceSampler", this._microSurfaceTexture)), this._bumpTexture && d.getCaps().standardDerivatives && S.BumpTextureEnabled && !this._disableBumpMap && _.setTexture("bumpSampler", this._bumpTexture)), this.getScene().useOrderIndependentTransparency && this.needAlphaBlendingForMesh(t) && this.getScene().depthPeelingRenderer.bind(c), this._eventInfo.subMesh = i, this._callbackPluginEventBindForSubMesh(this._eventInfo), Nt(this._activeEffect, this, a), this.bindEyePosition(c);
    } else
      a.getEngine()._features.needToAlwaysBindUniformBuffers && (this._needToBindSceneUbo = !0);
    (E || !this.isFrozen) && (a.lightsEnabled && !this._disableLighting && M.BindLights(a, t, this._activeEffect, f, this._maxSimultaneousLights), (a.fogEnabled && t.applyFog && a.fogMode !== xt.FOGMODE_NONE || u || t.receiveShadows || f.PREPASS) && this.bindView(c), M.BindFogParameters(a, t, this._activeEffect, !0), f.NUM_MORPH_INFLUENCERS && M.BindMorphTargetParameters(t, this._activeEffect), f.BAKED_VERTEX_ANIMATION_TEXTURE && ((o = t.bakedVertexAnimationManager) === null || o === void 0 || o.bind(c, f.INSTANCES)), this._imageProcessingConfiguration.bind(this._activeEffect), M.BindLogDepth(f, this._activeEffect, a)), this._afterBind(t, this._activeEffect), _.update();
  }
  /**
   * Returns the animatable textures.
   * If material have animatable metallic texture, then reflectivity texture will not be returned, even if it has animations.
   * @returns - Array of animatable textures.
   */
  getAnimatables() {
    const e = super.getAnimatables();
    return this._albedoTexture && this._albedoTexture.animations && this._albedoTexture.animations.length > 0 && e.push(this._albedoTexture), this._ambientTexture && this._ambientTexture.animations && this._ambientTexture.animations.length > 0 && e.push(this._ambientTexture), this._opacityTexture && this._opacityTexture.animations && this._opacityTexture.animations.length > 0 && e.push(this._opacityTexture), this._reflectionTexture && this._reflectionTexture.animations && this._reflectionTexture.animations.length > 0 && e.push(this._reflectionTexture), this._emissiveTexture && this._emissiveTexture.animations && this._emissiveTexture.animations.length > 0 && e.push(this._emissiveTexture), this._metallicTexture && this._metallicTexture.animations && this._metallicTexture.animations.length > 0 ? e.push(this._metallicTexture) : this._reflectivityTexture && this._reflectivityTexture.animations && this._reflectivityTexture.animations.length > 0 && e.push(this._reflectivityTexture), this._bumpTexture && this._bumpTexture.animations && this._bumpTexture.animations.length > 0 && e.push(this._bumpTexture), this._lightmapTexture && this._lightmapTexture.animations && this._lightmapTexture.animations.length > 0 && e.push(this._lightmapTexture), this._metallicReflectanceTexture && this._metallicReflectanceTexture.animations && this._metallicReflectanceTexture.animations.length > 0 && e.push(this._metallicReflectanceTexture), this._reflectanceTexture && this._reflectanceTexture.animations && this._reflectanceTexture.animations.length > 0 && e.push(this._reflectanceTexture), this._microSurfaceTexture && this._microSurfaceTexture.animations && this._microSurfaceTexture.animations.length > 0 && e.push(this._microSurfaceTexture), e;
  }
  /**
   * Returns the texture used for reflections.
   * @returns - Reflection texture if present.  Otherwise, returns the environment texture.
   */
  _getReflectionTexture() {
    return this._reflectionTexture ? this._reflectionTexture : this.getScene().environmentTexture;
  }
  /**
   * Returns an array of the actively used textures.
   * @returns - Array of BaseTextures
   */
  getActiveTextures() {
    const e = super.getActiveTextures();
    return this._albedoTexture && e.push(this._albedoTexture), this._ambientTexture && e.push(this._ambientTexture), this._opacityTexture && e.push(this._opacityTexture), this._reflectionTexture && e.push(this._reflectionTexture), this._emissiveTexture && e.push(this._emissiveTexture), this._reflectivityTexture && e.push(this._reflectivityTexture), this._metallicTexture && e.push(this._metallicTexture), this._metallicReflectanceTexture && e.push(this._metallicReflectanceTexture), this._reflectanceTexture && e.push(this._reflectanceTexture), this._microSurfaceTexture && e.push(this._microSurfaceTexture), this._bumpTexture && e.push(this._bumpTexture), this._lightmapTexture && e.push(this._lightmapTexture), e;
  }
  /**
   * Checks to see if a texture is used in the material.
   * @param texture - Base texture to use.
   * @returns - Boolean specifying if a texture is used in the material.
   */
  hasTexture(e) {
    return !!(super.hasTexture(e) || this._albedoTexture === e || this._ambientTexture === e || this._opacityTexture === e || this._reflectionTexture === e || this._emissiveTexture === e || this._reflectivityTexture === e || this._metallicTexture === e || this._metallicReflectanceTexture === e || this._reflectanceTexture === e || this._microSurfaceTexture === e || this._bumpTexture === e || this._lightmapTexture === e);
  }
  /**
   * Sets the required values to the prepass renderer.
   * It can't be sets when subsurface scattering of this material is disabled.
   * When scene have ability to enable subsurface prepass effect, it will enable.
   */
  setPrePassRenderer() {
    var e;
    if (!(!((e = this.subSurface) === null || e === void 0) && e.isScatteringEnabled))
      return !1;
    const t = this.getScene().enableSubSurfaceForPrePass();
    return t && (t.enabled = !0), !0;
  }
  /**
   * Disposes the resources of the material.
   * @param forceDisposeEffect - Forces the disposal of effects.
   * @param forceDisposeTextures - Forces the disposal of all textures.
   */
  dispose(e, t) {
    var i, r, s, n, o, a, f, c, d, E, u, _;
    t && (this._environmentBRDFTexture && this.getScene().environmentBRDFTexture !== this._environmentBRDFTexture && this._environmentBRDFTexture.dispose(), (i = this._albedoTexture) === null || i === void 0 || i.dispose(), (r = this._ambientTexture) === null || r === void 0 || r.dispose(), (s = this._opacityTexture) === null || s === void 0 || s.dispose(), (n = this._reflectionTexture) === null || n === void 0 || n.dispose(), (o = this._emissiveTexture) === null || o === void 0 || o.dispose(), (a = this._metallicTexture) === null || a === void 0 || a.dispose(), (f = this._reflectivityTexture) === null || f === void 0 || f.dispose(), (c = this._bumpTexture) === null || c === void 0 || c.dispose(), (d = this._lightmapTexture) === null || d === void 0 || d.dispose(), (E = this._metallicReflectanceTexture) === null || E === void 0 || E.dispose(), (u = this._reflectanceTexture) === null || u === void 0 || u.dispose(), (_ = this._microSurfaceTexture) === null || _ === void 0 || _.dispose()), this._renderTargets.dispose(), this._imageProcessingConfiguration && this._imageProcessingObserver && this._imageProcessingConfiguration.onUpdateParameters.remove(this._imageProcessingObserver), super.dispose(e, t);
  }
}
Y.PBRMATERIAL_OPAQUE = Ze.MATERIAL_OPAQUE;
Y.PBRMATERIAL_ALPHATEST = Ze.MATERIAL_ALPHATEST;
Y.PBRMATERIAL_ALPHABLEND = Ze.MATERIAL_ALPHABLEND;
Y.PBRMATERIAL_ALPHATESTANDBLEND = Ze.MATERIAL_ALPHATESTANDBLEND;
Y.DEFAULT_AO_ON_ANALYTICAL_LIGHTS = 0;
Y.LIGHTFALLOFF_PHYSICAL = 0;
Y.LIGHTFALLOFF_GLTF = 1;
Y.LIGHTFALLOFF_STANDARD = 2;
h([
  ar()
], Y.prototype, "_imageProcessingConfiguration", void 0);
h([
  v("_markAllSubMeshesAsMiscDirty")
], Y.prototype, "debugMode", void 0);
h([
  T()
], Y.prototype, "useLogarithmicDepth", null);
class F extends Y {
  /**
   * Stores the refracted light information in a texture.
   */
  get refractionTexture() {
    return this.subSurface.refractionTexture;
  }
  set refractionTexture(e) {
    this.subSurface.refractionTexture = e, e ? this.subSurface.isRefractionEnabled = !0 : this.subSurface.linkRefractionWithTransparency || (this.subSurface.isRefractionEnabled = !1);
  }
  /**
   * Index of refraction of the material base layer.
   * https://en.wikipedia.org/wiki/List_of_refractive_indices
   *
   * This does not only impact refraction but also the Base F0 of Dielectric Materials.
   *
   * From dielectric fresnel rules: F0 = square((iorT - iorI) / (iorT + iorI))
   */
  get indexOfRefraction() {
    return this.subSurface.indexOfRefraction;
  }
  set indexOfRefraction(e) {
    this.subSurface.indexOfRefraction = e;
  }
  /**
   * Controls if refraction needs to be inverted on Y. This could be useful for procedural texture.
   */
  get invertRefractionY() {
    return this.subSurface.invertRefractionY;
  }
  set invertRefractionY(e) {
    this.subSurface.invertRefractionY = e;
  }
  /**
   * This parameters will make the material used its opacity to control how much it is refracting against not.
   * Materials half opaque for instance using refraction could benefit from this control.
   */
  get linkRefractionWithTransparency() {
    return this.subSurface.linkRefractionWithTransparency;
  }
  set linkRefractionWithTransparency(e) {
    this.subSurface.linkRefractionWithTransparency = e, e && (this.subSurface.isRefractionEnabled = !0);
  }
  /**
   * BJS is using an hardcoded light falloff based on a manually sets up range.
   * In PBR, one way to represents the falloff is to use the inverse squared root algorithm.
   * This parameter can help you switch back to the BJS mode in order to create scenes using both materials.
   */
  get usePhysicalLightFalloff() {
    return this._lightFalloff === Y.LIGHTFALLOFF_PHYSICAL;
  }
  /**
   * BJS is using an hardcoded light falloff based on a manually sets up range.
   * In PBR, one way to represents the falloff is to use the inverse squared root algorithm.
   * This parameter can help you switch back to the BJS mode in order to create scenes using both materials.
   */
  set usePhysicalLightFalloff(e) {
    e !== this.usePhysicalLightFalloff && (this._markAllSubMeshesAsTexturesDirty(), e ? this._lightFalloff = Y.LIGHTFALLOFF_PHYSICAL : this._lightFalloff = Y.LIGHTFALLOFF_STANDARD);
  }
  /**
   * In order to support the falloff compatibility with gltf, a special mode has been added
   * to reproduce the gltf light falloff.
   */
  get useGLTFLightFalloff() {
    return this._lightFalloff === Y.LIGHTFALLOFF_GLTF;
  }
  /**
   * In order to support the falloff compatibility with gltf, a special mode has been added
   * to reproduce the gltf light falloff.
   */
  set useGLTFLightFalloff(e) {
    e !== this.useGLTFLightFalloff && (this._markAllSubMeshesAsTexturesDirty(), e ? this._lightFalloff = Y.LIGHTFALLOFF_GLTF : this._lightFalloff = Y.LIGHTFALLOFF_STANDARD);
  }
  /**
   * Gets the image processing configuration used either in this material.
   */
  get imageProcessingConfiguration() {
    return this._imageProcessingConfiguration;
  }
  /**
   * Sets the Default image processing configuration used either in the this material.
   *
   * If sets to null, the scene one is in use.
   */
  set imageProcessingConfiguration(e) {
    this._attachImageProcessingConfiguration(e), this._markAllSubMeshesAsTexturesDirty();
  }
  /**
   * Gets whether the color curves effect is enabled.
   */
  get cameraColorCurvesEnabled() {
    return this.imageProcessingConfiguration.colorCurvesEnabled;
  }
  /**
   * Sets whether the color curves effect is enabled.
   */
  set cameraColorCurvesEnabled(e) {
    this.imageProcessingConfiguration.colorCurvesEnabled = e;
  }
  /**
   * Gets whether the color grading effect is enabled.
   */
  get cameraColorGradingEnabled() {
    return this.imageProcessingConfiguration.colorGradingEnabled;
  }
  /**
   * Gets whether the color grading effect is enabled.
   */
  set cameraColorGradingEnabled(e) {
    this.imageProcessingConfiguration.colorGradingEnabled = e;
  }
  /**
   * Gets whether tonemapping is enabled or not.
   */
  get cameraToneMappingEnabled() {
    return this._imageProcessingConfiguration.toneMappingEnabled;
  }
  /**
   * Sets whether tonemapping is enabled or not
   */
  set cameraToneMappingEnabled(e) {
    this._imageProcessingConfiguration.toneMappingEnabled = e;
  }
  /**
   * The camera exposure used on this material.
   * This property is here and not in the camera to allow controlling exposure without full screen post process.
   * This corresponds to a photographic exposure.
   */
  get cameraExposure() {
    return this._imageProcessingConfiguration.exposure;
  }
  /**
   * The camera exposure used on this material.
   * This property is here and not in the camera to allow controlling exposure without full screen post process.
   * This corresponds to a photographic exposure.
   */
  set cameraExposure(e) {
    this._imageProcessingConfiguration.exposure = e;
  }
  /**
   * Gets The camera contrast used on this material.
   */
  get cameraContrast() {
    return this._imageProcessingConfiguration.contrast;
  }
  /**
   * Sets The camera contrast used on this material.
   */
  set cameraContrast(e) {
    this._imageProcessingConfiguration.contrast = e;
  }
  /**
   * Gets the Color Grading 2D Lookup Texture.
   */
  get cameraColorGradingTexture() {
    return this._imageProcessingConfiguration.colorGradingTexture;
  }
  /**
   * Sets the Color Grading 2D Lookup Texture.
   */
  set cameraColorGradingTexture(e) {
    this._imageProcessingConfiguration.colorGradingTexture = e;
  }
  /**
   * The color grading curves provide additional color adjustment that is applied after any color grading transform (3D LUT).
   * They allow basic adjustment of saturation and small exposure adjustments, along with color filter tinting to provide white balance adjustment or more stylistic effects.
   * These are similar to controls found in many professional imaging or colorist software. The global controls are applied to the entire image. For advanced tuning, extra controls are provided to adjust the shadow, midtone and highlight areas of the image;
   * corresponding to low luminance, medium luminance, and high luminance areas respectively.
   */
  get cameraColorCurves() {
    return this._imageProcessingConfiguration.colorCurves;
  }
  /**
   * The color grading curves provide additional color adjustment that is applied after any color grading transform (3D LUT).
   * They allow basic adjustment of saturation and small exposure adjustments, along with color filter tinting to provide white balance adjustment or more stylistic effects.
   * These are similar to controls found in many professional imaging or colorist software. The global controls are applied to the entire image. For advanced tuning, extra controls are provided to adjust the shadow, midtone and highlight areas of the image;
   * corresponding to low luminance, medium luminance, and high luminance areas respectively.
   */
  set cameraColorCurves(e) {
    this._imageProcessingConfiguration.colorCurves = e;
  }
  /**
   * Instantiates a new PBRMaterial instance.
   *
   * @param name The material name
   * @param scene The scene the material will be use in.
   */
  constructor(e, t) {
    super(e, t), this.directIntensity = 1, this.emissiveIntensity = 1, this.environmentIntensity = 1, this.specularIntensity = 1, this.disableBumpMap = !1, this.ambientTextureStrength = 1, this.ambientTextureImpactOnAnalyticalLights = F.DEFAULT_AO_ON_ANALYTICAL_LIGHTS, this.metallicF0Factor = 1, this.metallicReflectanceColor = K.White(), this.useOnlyMetallicFromMetallicReflectanceTexture = !1, this.ambientColor = new K(0, 0, 0), this.albedoColor = new K(1, 1, 1), this.reflectivityColor = new K(1, 1, 1), this.reflectionColor = new K(1, 1, 1), this.emissiveColor = new K(0, 0, 0), this.microSurface = 1, this.useLightmapAsShadowmap = !1, this.useAlphaFromAlbedoTexture = !1, this.forceAlphaTest = !1, this.alphaCutOff = 0.4, this.useSpecularOverAlpha = !0, this.useMicroSurfaceFromReflectivityMapAlpha = !1, this.useRoughnessFromMetallicTextureAlpha = !0, this.useRoughnessFromMetallicTextureGreen = !1, this.useMetallnessFromMetallicTextureBlue = !1, this.useAmbientOcclusionFromMetallicTextureRed = !1, this.useAmbientInGrayScale = !1, this.useAutoMicroSurfaceFromReflectivityMap = !1, this.useRadianceOverAlpha = !0, this.useObjectSpaceNormalMap = !1, this.useParallax = !1, this.useParallaxOcclusion = !1, this.parallaxScaleBias = 0.05, this.disableLighting = !1, this.forceIrradianceInFragment = !1, this.maxSimultaneousLights = 4, this.invertNormalMapX = !1, this.invertNormalMapY = !1, this.twoSidedLighting = !1, this.useAlphaFresnel = !1, this.useLinearAlphaFresnel = !1, this.environmentBRDFTexture = null, this.forceNormalForward = !1, this.enableSpecularAntiAliasing = !1, this.useHorizonOcclusion = !0, this.useRadianceOcclusion = !0, this.unlit = !1, this._environmentBRDFTexture = Gi(this.getScene());
  }
  /**
   * Returns the name of this material class.
   */
  getClassName() {
    return "PBRMaterial";
  }
  /**
   * Makes a duplicate of the current material.
   * @param name - name to use for the new material.
   */
  clone(e) {
    const t = j.Clone(() => new F(e, this.getScene()), this);
    return t.id = e, t.name = e, this.stencil.copyTo(t.stencil), this.clearCoat.copyTo(t.clearCoat), this.anisotropy.copyTo(t.anisotropy), this.brdf.copyTo(t.brdf), this.sheen.copyTo(t.sheen), this.subSurface.copyTo(t.subSurface), this.iridescence.copyTo(t.iridescence), t;
  }
  /**
   * Serializes this PBR Material.
   * @returns - An object with the serialized material.
   */
  serialize() {
    const e = super.serialize();
    return e.customType = "BABYLON.PBRMaterial", e.clearCoat = this.clearCoat.serialize(), e.anisotropy = this.anisotropy.serialize(), e.brdf = this.brdf.serialize(), e.sheen = this.sheen.serialize(), e.subSurface = this.subSurface.serialize(), e.iridescence = this.iridescence.serialize(), e;
  }
  // Statics
  /**
   * Parses a PBR Material from a serialized object.
   * @param source - Serialized object.
   * @param scene - BJS scene instance.
   * @param rootUrl - url for the scene object
   * @returns - PBRMaterial
   */
  static Parse(e, t, i) {
    const r = j.Parse(() => new F(e.name, t), e, t, i);
    return e.stencil && r.stencil.parse(e.stencil, t, i), e.clearCoat && r.clearCoat.parse(e.clearCoat, t, i), e.anisotropy && r.anisotropy.parse(e.anisotropy, t, i), e.brdf && r.brdf.parse(e.brdf, t, i), e.sheen && r.sheen.parse(e.sheen, t, i), e.subSurface && r.subSurface.parse(e.subSurface, t, i), e.iridescence && r.iridescence.parse(e.iridescence, t, i), r;
  }
}
F.PBRMATERIAL_OPAQUE = Y.PBRMATERIAL_OPAQUE;
F.PBRMATERIAL_ALPHATEST = Y.PBRMATERIAL_ALPHATEST;
F.PBRMATERIAL_ALPHABLEND = Y.PBRMATERIAL_ALPHABLEND;
F.PBRMATERIAL_ALPHATESTANDBLEND = Y.PBRMATERIAL_ALPHATESTANDBLEND;
F.DEFAULT_AO_ON_ANALYTICAL_LIGHTS = Y.DEFAULT_AO_ON_ANALYTICAL_LIGHTS;
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "directIntensity", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "emissiveIntensity", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "environmentIntensity", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "specularIntensity", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "disableBumpMap", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "albedoTexture", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "ambientTexture", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "ambientTextureStrength", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "ambientTextureImpactOnAnalyticalLights", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesAndMiscDirty")
], F.prototype, "opacityTexture", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "reflectionTexture", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "emissiveTexture", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "reflectivityTexture", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "metallicTexture", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "metallic", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "roughness", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "metallicF0Factor", void 0);
h([
  ce(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "metallicReflectanceColor", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "useOnlyMetallicFromMetallicReflectanceTexture", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "metallicReflectanceTexture", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "reflectanceTexture", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "microSurfaceTexture", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "bumpTexture", void 0);
h([
  z(),
  v("_markAllSubMeshesAsTexturesDirty", null)
], F.prototype, "lightmapTexture", void 0);
h([
  ce("ambient"),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "ambientColor", void 0);
h([
  ce("albedo"),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "albedoColor", void 0);
h([
  ce("reflectivity"),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "reflectivityColor", void 0);
h([
  ce("reflection"),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "reflectionColor", void 0);
h([
  ce("emissive"),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "emissiveColor", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "microSurface", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "useLightmapAsShadowmap", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesAndMiscDirty")
], F.prototype, "useAlphaFromAlbedoTexture", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesAndMiscDirty")
], F.prototype, "forceAlphaTest", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesAndMiscDirty")
], F.prototype, "alphaCutOff", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "useSpecularOverAlpha", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "useMicroSurfaceFromReflectivityMapAlpha", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "useRoughnessFromMetallicTextureAlpha", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "useRoughnessFromMetallicTextureGreen", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "useMetallnessFromMetallicTextureBlue", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "useAmbientOcclusionFromMetallicTextureRed", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "useAmbientInGrayScale", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "useAutoMicroSurfaceFromReflectivityMap", void 0);
h([
  T()
], F.prototype, "usePhysicalLightFalloff", null);
h([
  T()
], F.prototype, "useGLTFLightFalloff", null);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "useRadianceOverAlpha", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "useObjectSpaceNormalMap", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "useParallax", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "useParallaxOcclusion", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "parallaxScaleBias", void 0);
h([
  T(),
  v("_markAllSubMeshesAsLightsDirty")
], F.prototype, "disableLighting", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "forceIrradianceInFragment", void 0);
h([
  T(),
  v("_markAllSubMeshesAsLightsDirty")
], F.prototype, "maxSimultaneousLights", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "invertNormalMapX", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "invertNormalMapY", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "twoSidedLighting", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "useAlphaFresnel", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "useLinearAlphaFresnel", void 0);
h([
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "environmentBRDFTexture", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "forceNormalForward", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "enableSpecularAntiAliasing", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "useHorizonOcclusion", void 0);
h([
  T(),
  v("_markAllSubMeshesAsTexturesDirty")
], F.prototype, "useRadianceOcclusion", void 0);
h([
  T(),
  v("_markAllSubMeshesAsMiscDirty")
], F.prototype, "unlit", void 0);
Fe("BABYLON.PBRMaterial", F);
function Ft(l, e, t, i) {
  let r = i, s = 0, n = "";
  for (; r < t.length; ) {
    const o = t.charAt(r);
    if (n)
      o === n ? n === '"' || n === "'" ? t.charAt(r - 1) !== "\\" && (n = "") : n = "" : n === "*/" && o === "*" && r + 1 < t.length && (t.charAt(r + 1) === "/" && (n = ""), n === "" && r++);
    else
      switch (o) {
        case l:
          s++;
          break;
        case e:
          s--;
          break;
        case '"':
        case "'":
        case "`":
          n = o;
          break;
        case "/":
          if (r + 1 < t.length) {
            const a = t.charAt(r + 1);
            a === "/" ? n = `
` : a === "*" && (n = "*/");
          }
          break;
      }
    if (r++, s === 0)
      break;
  }
  return s === 0 ? r - 1 : -1;
}
function Ii(l, e) {
  for (; e < l.length; ) {
    const t = l[e];
    if (t !== " " && t !== `
` && t !== "\r" && t !== "	" && t !== `
` && t !== " ")
      break;
    e++;
  }
  return e;
}
function ii(l) {
  const e = l.charCodeAt(0);
  return e >= 48 && e <= 57 || // 0-9
  e >= 65 && e <= 90 || // A-Z
  e >= 97 && e <= 122 || // a-z
  e == 95;
}
function Mi(l) {
  let e = 0, t = "", i = !1;
  const r = [];
  for (; e < l.length; ) {
    const s = l.charAt(e);
    if (t)
      s === t ? t === '"' || t === "'" ? (l.charAt(e - 1) !== "\\" && (t = ""), r.push(s)) : (t = "", i = !1) : t === "*/" && s === "*" && e + 1 < l.length ? (l.charAt(e + 1) === "/" && (t = ""), t === "" && (i = !1, e++)) : i || r.push(s);
    else {
      switch (s) {
        case '"':
        case "'":
        case "`":
          t = s;
          break;
        case "/":
          if (e + 1 < l.length) {
            const n = l.charAt(e + 1);
            n === "/" ? (t = `
`, i = !0) : n === "*" && (t = "*/", i = !0);
          }
          break;
      }
      i || r.push(s);
    }
    e++;
  }
  return r.join("");
}
function Bl(l, e, t) {
  for (; e >= 0 && l.charAt(e) !== t; )
    e--;
  return e;
}
function Vl(l) {
  return l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
class Wt {
  /** Gets the code after the inlining process */
  get code() {
    return this._sourceCode;
  }
  /**
   * Initializes the inliner
   * @param sourceCode shader code source to inline
   * @param numMaxIterations maximum number of iterations (used to detect recursive calls)
   */
  constructor(e, t = 20) {
    this.debug = !1, this._sourceCode = e, this._numMaxIterations = t, this._functionDescr = [], this.inlineToken = "#define inline";
  }
  /**
   * Start the processing of the shader code
   */
  processCode() {
    this.debug && console.log(`Start inlining process (code size=${this._sourceCode.length})...`), this._collectFunctions(), this._processInlining(this._numMaxIterations), this.debug && console.log("End of inlining process.");
  }
  _collectFunctions() {
    let e = 0;
    for (; e < this._sourceCode.length; ) {
      const t = this._sourceCode.indexOf(this.inlineToken, e);
      if (t < 0)
        break;
      const i = this._sourceCode.indexOf("(", t + this.inlineToken.length);
      if (i < 0) {
        this.debug && console.warn(`Could not find the opening parenthesis after the token. startIndex=${e}`), e = t + this.inlineToken.length;
        continue;
      }
      const r = Wt._RegexpFindFunctionNameAndType.exec(this._sourceCode.substring(t + this.inlineToken.length, i));
      if (!r) {
        this.debug && console.warn(`Could not extract the name/type of the function from: ${this._sourceCode.substring(t + this.inlineToken.length, i)}`), e = t + this.inlineToken.length;
        continue;
      }
      const [s, n] = [r[3], r[4]], o = Ft("(", ")", this._sourceCode, i);
      if (o < 0) {
        this.debug && console.warn(`Could not extract the parameters the function '${n}' (type=${s}). funcParamsStartIndex=${i}`), e = t + this.inlineToken.length;
        continue;
      }
      const a = this._sourceCode.substring(i + 1, o), f = Ii(this._sourceCode, o + 1);
      if (f === this._sourceCode.length) {
        this.debug && console.warn(`Could not extract the body of the function '${n}' (type=${s}). funcParamsEndIndex=${o}`), e = t + this.inlineToken.length;
        continue;
      }
      const c = Ft("{", "}", this._sourceCode, f);
      if (c < 0) {
        this.debug && console.warn(`Could not extract the body of the function '${n}' (type=${s}). funcBodyStartIndex=${f}`), e = t + this.inlineToken.length;
        continue;
      }
      const d = this._sourceCode.substring(f, c + 1), E = Mi(a).split(","), u = [];
      for (let A = 0; A < E.length; ++A) {
        const R = E[A].trim(), N = R.lastIndexOf(" ");
        N >= 0 && u.push(R.substring(N + 1));
      }
      s !== "void" && u.push("return"), this._functionDescr.push({
        name: n,
        type: s,
        parameters: u,
        body: d,
        callIndex: 0
      }), e = c + 1;
      const _ = t > 0 ? this._sourceCode.substring(0, t) : "", p = c + 1 < this._sourceCode.length - 1 ? this._sourceCode.substring(c + 1) : "";
      this._sourceCode = _ + p, e -= c + 1 - t;
    }
    this.debug && console.log(`Collect functions: ${this._functionDescr.length} functions found. functionDescr=`, this._functionDescr);
  }
  _processInlining(e = 20) {
    for (; e-- >= 0 && this._replaceFunctionCallsByCode(); )
      ;
    return this.debug && console.log(`numMaxIterations is ${e} after inlining process`), e >= 0;
  }
  _replaceFunctionCallsByCode() {
    let e = !1;
    for (const t of this._functionDescr) {
      const { name: i, type: r, parameters: s, body: n } = t;
      let o = 0;
      for (; o < this._sourceCode.length; ) {
        const a = this._sourceCode.indexOf(i, o);
        if (a < 0)
          break;
        if (a === 0 || ii(this._sourceCode.charAt(a - 1))) {
          o = a + i.length;
          continue;
        }
        const f = Ii(this._sourceCode, a + i.length);
        if (f === this._sourceCode.length || this._sourceCode.charAt(f) !== "(") {
          o = a + i.length;
          continue;
        }
        const c = Ft("(", ")", this._sourceCode, f);
        if (c < 0) {
          this.debug && console.warn(`Could not extract the parameters of the function call. Function '${i}' (type=${r}). callParamsStartIndex=${f}`), o = a + i.length;
          continue;
        }
        const d = this._sourceCode.substring(f + 1, c), u = ((O) => {
          const L = [];
          let U = 0, y = 0;
          for (; U < O.length; ) {
            if (O.charAt(U) === "(") {
              const D = Ft("(", ")", O, U);
              if (D < 0)
                return null;
              U = D;
            } else
              O.charAt(U) === "," && (L.push(O.substring(y, U)), y = U + 1);
            U++;
          }
          return y < U && L.push(O.substring(y, U)), L;
        })(Mi(d));
        if (u === null) {
          this.debug && console.warn(`Invalid function call: can't extract the parameters of the function call. Function '${i}' (type=${r}). callParamsStartIndex=${f}, callParams=` + d), o = a + i.length;
          continue;
        }
        const _ = [];
        for (let O = 0; O < u.length; ++O) {
          const L = u[O].trim();
          _.push(L);
        }
        const p = r !== "void" ? i + "_" + t.callIndex++ : null;
        if (p && _.push(p + " ="), _.length !== s.length) {
          this.debug && console.warn(`Invalid function call: not the same number of parameters for the call than the number expected by the function. Function '${i}' (type=${r}). function parameters=${s}, call parameters=${_}`), o = a + i.length;
          continue;
        }
        o = c + 1;
        const A = this._replaceNames(n, s, _);
        let R = a > 0 ? this._sourceCode.substring(0, a) : "";
        const N = c + 1 < this._sourceCode.length - 1 ? this._sourceCode.substring(c + 1) : "";
        if (p) {
          const O = Bl(this._sourceCode, a - 1, `
`);
          R = this._sourceCode.substring(0, O + 1);
          const L = this._sourceCode.substring(O + 1, a);
          this._sourceCode = R + r + " " + p + `;
` + A + `
` + L + p + N, this.debug && console.log(`Replace function call by code. Function '${i}' (type=${r}). injectDeclarationIndex=${O}, call parameters=${_}`);
        } else
          this._sourceCode = R + A + N, o += A.length - (c + 1 - a), this.debug && console.log(`Replace function call by code. Function '${i}' (type=${r}). functionCallIndex=${a}, call parameters=${_}`);
        e = !0;
      }
    }
    return e;
  }
  _replaceNames(e, t, i) {
    for (let r = 0; r < t.length; ++r) {
      const s = new RegExp(Vl(t[r]), "g"), n = t[r].length, o = i[r];
      e = e.replace(s, (a, ...f) => {
        const c = f[0];
        return ii(e.charAt(c - 1)) || ii(e.charAt(c + n)) ? t[r] : o;
      });
    }
    return e;
  }
}
Wt._RegexpFindFunctionNameAndType = /((\s+?)(\w+)\s+(\w+)\s*?)$/;
class Gl {
  constructor() {
  }
}
class tt extends F {
  AttachAfterBind(e, t) {
    if (this._newUniformInstances)
      for (const i in this._newUniformInstances) {
        const r = i.toString().split("-");
        r[0] == "vec2" ? t.setVector2(r[1], this._newUniformInstances[i]) : r[0] == "vec3" ? t.setVector3(r[1], this._newUniformInstances[i]) : r[0] == "vec4" ? t.setVector4(r[1], this._newUniformInstances[i]) : r[0] == "mat4" ? t.setMatrix(r[1], this._newUniformInstances[i]) : r[0] == "float" && t.setFloat(r[1], this._newUniformInstances[i]);
      }
    if (this._newSamplerInstances)
      for (const i in this._newSamplerInstances) {
        const r = i.toString().split("-");
        r[0] == "sampler2D" && this._newSamplerInstances[i].isReady && this._newSamplerInstances[i].isReady() && t.setTexture(r[1], this._newSamplerInstances[i]);
      }
  }
  ReviewUniform(e, t) {
    if (e == "uniform" && this._newUniforms)
      for (let i = 0; i < this._newUniforms.length; i++)
        this._customUniform[i].indexOf("sampler") == -1 && t.push(this._newUniforms[i].replace(/\[\d*\]/g, ""));
    if (e == "sampler" && this._newUniforms)
      for (let i = 0; i < this._newUniforms.length; i++)
        this._customUniform[i].indexOf("sampler") != -1 && t.push(this._newUniforms[i].replace(/\[\d*\]/g, ""));
    return t;
  }
  Builder(e, t, i, r, s, n, o) {
    if (o) {
      const c = o.processFinalCode;
      o.processFinalCode = (d, E) => {
        if (d === "vertex")
          return c ? c(d, E) : E;
        const u = new Wt(E);
        return u.inlineToken = "#define pbr_inline", u.processCode(), c ? c(d, u.code) : u.code;
      };
    }
    if (n && this._customAttributes && this._customAttributes.length > 0 && n.push(...this._customAttributes), this.ReviewUniform("uniform", t), this.ReviewUniform("sampler", r), this._isCreatedShader)
      return this._createdShaderName;
    this._isCreatedShader = !1, tt.ShaderIndexer++;
    const a = "custom_" + tt.ShaderIndexer, f = this._afterBind.bind(this);
    return this._afterBind = (c, d) => {
      if (d) {
        this.AttachAfterBind(c, d);
        try {
          f(c, d);
        } catch {
        }
      }
    }, ne.ShadersStore[a + "VertexShader"] = this.VertexShader.replace("#define CUSTOM_VERTEX_BEGIN", this.CustomParts.Vertex_Begin ? this.CustomParts.Vertex_Begin : "").replace("#define CUSTOM_VERTEX_DEFINITIONS", (this._customUniform ? this._customUniform.join(`
`) : "") + (this.CustomParts.Vertex_Definitions ? this.CustomParts.Vertex_Definitions : "")).replace("#define CUSTOM_VERTEX_MAIN_BEGIN", this.CustomParts.Vertex_MainBegin ? this.CustomParts.Vertex_MainBegin : "").replace("#define CUSTOM_VERTEX_UPDATE_POSITION", this.CustomParts.Vertex_Before_PositionUpdated ? this.CustomParts.Vertex_Before_PositionUpdated : "").replace("#define CUSTOM_VERTEX_UPDATE_NORMAL", this.CustomParts.Vertex_Before_NormalUpdated ? this.CustomParts.Vertex_Before_NormalUpdated : "").replace("#define CUSTOM_VERTEX_MAIN_END", this.CustomParts.Vertex_MainEnd ? this.CustomParts.Vertex_MainEnd : ""), this.CustomParts.Vertex_After_WorldPosComputed && (ne.ShadersStore[a + "VertexShader"] = ne.ShadersStore[a + "VertexShader"].replace("#define CUSTOM_VERTEX_UPDATE_WORLDPOS", this.CustomParts.Vertex_After_WorldPosComputed)), ne.ShadersStore[a + "PixelShader"] = this.FragmentShader.replace("#define CUSTOM_FRAGMENT_BEGIN", this.CustomParts.Fragment_Begin ? this.CustomParts.Fragment_Begin : "").replace("#define CUSTOM_FRAGMENT_MAIN_BEGIN", this.CustomParts.Fragment_MainBegin ? this.CustomParts.Fragment_MainBegin : "").replace("#define CUSTOM_FRAGMENT_DEFINITIONS", (this._customUniform ? this._customUniform.join(`
`) : "") + (this.CustomParts.Fragment_Definitions ? this.CustomParts.Fragment_Definitions : "")).replace("#define CUSTOM_FRAGMENT_UPDATE_ALBEDO", this.CustomParts.Fragment_Custom_Albedo ? this.CustomParts.Fragment_Custom_Albedo : "").replace("#define CUSTOM_FRAGMENT_UPDATE_ALPHA", this.CustomParts.Fragment_Custom_Alpha ? this.CustomParts.Fragment_Custom_Alpha : "").replace("#define CUSTOM_FRAGMENT_BEFORE_LIGHTS", this.CustomParts.Fragment_Before_Lights ? this.CustomParts.Fragment_Before_Lights : "").replace("#define CUSTOM_FRAGMENT_UPDATE_METALLICROUGHNESS", this.CustomParts.Fragment_Custom_MetallicRoughness ? this.CustomParts.Fragment_Custom_MetallicRoughness : "").replace("#define CUSTOM_FRAGMENT_UPDATE_MICROSURFACE", this.CustomParts.Fragment_Custom_MicroSurface ? this.CustomParts.Fragment_Custom_MicroSurface : "").replace("#define CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION", this.CustomParts.Fragment_Before_FinalColorComposition ? this.CustomParts.Fragment_Before_FinalColorComposition : "").replace("#define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR", this.CustomParts.Fragment_Before_FragColor ? this.CustomParts.Fragment_Before_FragColor : "").replace("#define CUSTOM_FRAGMENT_MAIN_END", this.CustomParts.Fragment_MainEnd ? this.CustomParts.Fragment_MainEnd : ""), this.CustomParts.Fragment_Before_Fog && (ne.ShadersStore[a + "PixelShader"] = ne.ShadersStore[a + "PixelShader"].replace("#define CUSTOM_FRAGMENT_BEFORE_FOG", this.CustomParts.Fragment_Before_Fog)), this._isCreatedShader = !0, this._createdShaderName = a, a;
  }
  constructor(e, t) {
    super(e, t), this.CustomParts = new Gl(), this.customShaderNameResolve = this.Builder, this.FragmentShader = ne.ShadersStore.pbrPixelShader, this.VertexShader = ne.ShadersStore.pbrVertexShader, this.FragmentShader = this.FragmentShader.replace(/#include<pbrBlockAlbedoOpacity>/g, ne.IncludesShadersStore.pbrBlockAlbedoOpacity), this.FragmentShader = this.FragmentShader.replace(/#include<pbrBlockReflectivity>/g, ne.IncludesShadersStore.pbrBlockReflectivity), this.FragmentShader = this.FragmentShader.replace(/#include<pbrBlockFinalColorComposition>/g, ne.IncludesShadersStore.pbrBlockFinalColorComposition);
  }
  AddUniform(e, t, i) {
    return this._customUniform || (this._customUniform = new Array(), this._newUniforms = new Array(), this._newSamplerInstances = {}, this._newUniformInstances = {}), i && (t.indexOf("sampler") != -1 ? this._newSamplerInstances[t + "-" + e] = i : this._newUniformInstances[t + "-" + e] = i), this._customUniform.push("uniform " + t + " " + e + ";"), this._newUniforms.push(e), this;
  }
  AddAttribute(e) {
    return this._customAttributes || (this._customAttributes = []), this._customAttributes.push(e), this;
  }
  Fragment_Begin(e) {
    return this.CustomParts.Fragment_Begin = e, this;
  }
  Fragment_Definitions(e) {
    return this.CustomParts.Fragment_Definitions = e, this;
  }
  Fragment_MainBegin(e) {
    return this.CustomParts.Fragment_MainBegin = e, this;
  }
  Fragment_Custom_Albedo(e) {
    return this.CustomParts.Fragment_Custom_Albedo = e.replace("result", "surfaceAlbedo"), this;
  }
  Fragment_Custom_Alpha(e) {
    return this.CustomParts.Fragment_Custom_Alpha = e.replace("result", "alpha"), this;
  }
  Fragment_Before_Lights(e) {
    return this.CustomParts.Fragment_Before_Lights = e, this;
  }
  Fragment_Custom_MetallicRoughness(e) {
    return this.CustomParts.Fragment_Custom_MetallicRoughness = e, this;
  }
  Fragment_Custom_MicroSurface(e) {
    return this.CustomParts.Fragment_Custom_MicroSurface = e, this;
  }
  Fragment_Before_Fog(e) {
    return this.CustomParts.Fragment_Before_Fog = e, this;
  }
  Fragment_Before_FinalColorComposition(e) {
    return this.CustomParts.Fragment_Before_FinalColorComposition = e, this;
  }
  Fragment_Before_FragColor(e) {
    return this.CustomParts.Fragment_Before_FragColor = e.replace("result", "color"), this;
  }
  Fragment_MainEnd(e) {
    return this.CustomParts.Fragment_MainEnd = e, this;
  }
  Vertex_Begin(e) {
    return this.CustomParts.Vertex_Begin = e, this;
  }
  Vertex_Definitions(e) {
    return this.CustomParts.Vertex_Definitions = e, this;
  }
  Vertex_MainBegin(e) {
    return this.CustomParts.Vertex_MainBegin = e, this;
  }
  Vertex_Before_PositionUpdated(e) {
    return this.CustomParts.Vertex_Before_PositionUpdated = e.replace("result", "positionUpdated"), this;
  }
  Vertex_Before_NormalUpdated(e) {
    return this.CustomParts.Vertex_Before_NormalUpdated = e.replace("result", "normalUpdated"), this;
  }
  Vertex_After_WorldPosComputed(e) {
    return this.CustomParts.Vertex_After_WorldPosComputed = e, this;
  }
  Vertex_MainEnd(e) {
    return this.CustomParts.Vertex_MainEnd = e, this;
  }
}
tt.ShaderIndexer = 1;
Fe("BABYLON.PBRCustomMaterial", tt);
class m {
}
m.ALPHA_DISABLE = 0;
m.ALPHA_ADD = 1;
m.ALPHA_COMBINE = 2;
m.ALPHA_SUBTRACT = 3;
m.ALPHA_MULTIPLY = 4;
m.ALPHA_MAXIMIZED = 5;
m.ALPHA_ONEONE = 6;
m.ALPHA_PREMULTIPLIED = 7;
m.ALPHA_PREMULTIPLIED_PORTERDUFF = 8;
m.ALPHA_INTERPOLATE = 9;
m.ALPHA_SCREENMODE = 10;
m.ALPHA_ONEONE_ONEONE = 11;
m.ALPHA_ALPHATOCOLOR = 12;
m.ALPHA_REVERSEONEMINUS = 13;
m.ALPHA_SRC_DSTONEMINUSSRCALPHA = 14;
m.ALPHA_ONEONE_ONEZERO = 15;
m.ALPHA_EXCLUSION = 16;
m.ALPHA_LAYER_ACCUMULATE = 17;
m.ALPHA_EQUATION_ADD = 0;
m.ALPHA_EQUATION_SUBSTRACT = 1;
m.ALPHA_EQUATION_REVERSE_SUBTRACT = 2;
m.ALPHA_EQUATION_MAX = 3;
m.ALPHA_EQUATION_MIN = 4;
m.ALPHA_EQUATION_DARKEN = 5;
m.DELAYLOADSTATE_NONE = 0;
m.DELAYLOADSTATE_LOADED = 1;
m.DELAYLOADSTATE_LOADING = 2;
m.DELAYLOADSTATE_NOTLOADED = 4;
m.NEVER = 512;
m.ALWAYS = 519;
m.LESS = 513;
m.EQUAL = 514;
m.LEQUAL = 515;
m.GREATER = 516;
m.GEQUAL = 518;
m.NOTEQUAL = 517;
m.KEEP = 7680;
m.ZERO = 0;
m.REPLACE = 7681;
m.INCR = 7682;
m.DECR = 7683;
m.INVERT = 5386;
m.INCR_WRAP = 34055;
m.DECR_WRAP = 34056;
m.TEXTURE_CLAMP_ADDRESSMODE = 0;
m.TEXTURE_WRAP_ADDRESSMODE = 1;
m.TEXTURE_MIRROR_ADDRESSMODE = 2;
m.TEXTURE_CREATIONFLAG_STORAGE = 1;
m.TEXTUREFORMAT_ALPHA = 0;
m.TEXTUREFORMAT_LUMINANCE = 1;
m.TEXTUREFORMAT_LUMINANCE_ALPHA = 2;
m.TEXTUREFORMAT_RGB = 4;
m.TEXTUREFORMAT_RGBA = 5;
m.TEXTUREFORMAT_RED = 6;
m.TEXTUREFORMAT_R = 6;
m.TEXTUREFORMAT_RG = 7;
m.TEXTUREFORMAT_RED_INTEGER = 8;
m.TEXTUREFORMAT_R_INTEGER = 8;
m.TEXTUREFORMAT_RG_INTEGER = 9;
m.TEXTUREFORMAT_RGB_INTEGER = 10;
m.TEXTUREFORMAT_RGBA_INTEGER = 11;
m.TEXTUREFORMAT_BGRA = 12;
m.TEXTUREFORMAT_DEPTH24_STENCIL8 = 13;
m.TEXTUREFORMAT_DEPTH32_FLOAT = 14;
m.TEXTUREFORMAT_DEPTH16 = 15;
m.TEXTUREFORMAT_DEPTH24 = 16;
m.TEXTUREFORMAT_DEPTH24UNORM_STENCIL8 = 17;
m.TEXTUREFORMAT_DEPTH32FLOAT_STENCIL8 = 18;
m.TEXTUREFORMAT_STENCIL8 = 19;
m.TEXTUREFORMAT_COMPRESSED_RGBA_BPTC_UNORM = 36492;
m.TEXTUREFORMAT_COMPRESSED_SRGB_ALPHA_BPTC_UNORM = 36493;
m.TEXTUREFORMAT_COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT = 36495;
m.TEXTUREFORMAT_COMPRESSED_RGB_BPTC_SIGNED_FLOAT = 36494;
m.TEXTUREFORMAT_COMPRESSED_RGBA_S3TC_DXT5 = 33779;
m.TEXTUREFORMAT_COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT = 35919;
m.TEXTUREFORMAT_COMPRESSED_RGBA_S3TC_DXT3 = 33778;
m.TEXTUREFORMAT_COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT = 35918;
m.TEXTUREFORMAT_COMPRESSED_RGBA_S3TC_DXT1 = 33777;
m.TEXTUREFORMAT_COMPRESSED_RGB_S3TC_DXT1 = 33776;
m.TEXTUREFORMAT_COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT = 35917;
m.TEXTUREFORMAT_COMPRESSED_SRGB_S3TC_DXT1_EXT = 35916;
m.TEXTUREFORMAT_COMPRESSED_RGBA_ASTC_4x4 = 37808;
m.TEXTUREFORMAT_COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR = 37840;
m.TEXTUREFORMAT_COMPRESSED_RGB_ETC1_WEBGL = 36196;
m.TEXTUREFORMAT_COMPRESSED_RGB8_ETC2 = 37492;
m.TEXTUREFORMAT_COMPRESSED_SRGB8_ETC2 = 37493;
m.TEXTUREFORMAT_COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2 = 37494;
m.TEXTUREFORMAT_COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2 = 37495;
m.TEXTUREFORMAT_COMPRESSED_RGBA8_ETC2_EAC = 37496;
m.TEXTUREFORMAT_COMPRESSED_SRGB8_ALPHA8_ETC2_EAC = 37497;
m.TEXTURETYPE_UNSIGNED_BYTE = 0;
m.TEXTURETYPE_UNSIGNED_INT = 0;
m.TEXTURETYPE_FLOAT = 1;
m.TEXTURETYPE_HALF_FLOAT = 2;
m.TEXTURETYPE_BYTE = 3;
m.TEXTURETYPE_SHORT = 4;
m.TEXTURETYPE_UNSIGNED_SHORT = 5;
m.TEXTURETYPE_INT = 6;
m.TEXTURETYPE_UNSIGNED_INTEGER = 7;
m.TEXTURETYPE_UNSIGNED_SHORT_4_4_4_4 = 8;
m.TEXTURETYPE_UNSIGNED_SHORT_5_5_5_1 = 9;
m.TEXTURETYPE_UNSIGNED_SHORT_5_6_5 = 10;
m.TEXTURETYPE_UNSIGNED_INT_2_10_10_10_REV = 11;
m.TEXTURETYPE_UNSIGNED_INT_24_8 = 12;
m.TEXTURETYPE_UNSIGNED_INT_10F_11F_11F_REV = 13;
m.TEXTURETYPE_UNSIGNED_INT_5_9_9_9_REV = 14;
m.TEXTURETYPE_FLOAT_32_UNSIGNED_INT_24_8_REV = 15;
m.TEXTURETYPE_UNDEFINED = 16;
m.TEXTURE_2D = 3553;
m.TEXTURE_2D_ARRAY = 35866;
m.TEXTURE_CUBE_MAP = 34067;
m.TEXTURE_CUBE_MAP_ARRAY = 3735928559;
m.TEXTURE_3D = 32879;
m.TEXTURE_NEAREST_SAMPLINGMODE = 1;
m.TEXTURE_NEAREST_NEAREST = 1;
m.TEXTURE_BILINEAR_SAMPLINGMODE = 2;
m.TEXTURE_LINEAR_LINEAR = 2;
m.TEXTURE_TRILINEAR_SAMPLINGMODE = 3;
m.TEXTURE_LINEAR_LINEAR_MIPLINEAR = 3;
m.TEXTURE_NEAREST_NEAREST_MIPNEAREST = 4;
m.TEXTURE_NEAREST_LINEAR_MIPNEAREST = 5;
m.TEXTURE_NEAREST_LINEAR_MIPLINEAR = 6;
m.TEXTURE_NEAREST_LINEAR = 7;
m.TEXTURE_NEAREST_NEAREST_MIPLINEAR = 8;
m.TEXTURE_LINEAR_NEAREST_MIPNEAREST = 9;
m.TEXTURE_LINEAR_NEAREST_MIPLINEAR = 10;
m.TEXTURE_LINEAR_LINEAR_MIPNEAREST = 11;
m.TEXTURE_LINEAR_NEAREST = 12;
m.TEXTURE_EXPLICIT_MODE = 0;
m.TEXTURE_SPHERICAL_MODE = 1;
m.TEXTURE_PLANAR_MODE = 2;
m.TEXTURE_CUBIC_MODE = 3;
m.TEXTURE_PROJECTION_MODE = 4;
m.TEXTURE_SKYBOX_MODE = 5;
m.TEXTURE_INVCUBIC_MODE = 6;
m.TEXTURE_EQUIRECTANGULAR_MODE = 7;
m.TEXTURE_FIXED_EQUIRECTANGULAR_MODE = 8;
m.TEXTURE_FIXED_EQUIRECTANGULAR_MIRRORED_MODE = 9;
m.TEXTURE_FILTERING_QUALITY_OFFLINE = 4096;
m.TEXTURE_FILTERING_QUALITY_HIGH = 64;
m.TEXTURE_FILTERING_QUALITY_MEDIUM = 16;
m.TEXTURE_FILTERING_QUALITY_LOW = 8;
m.SCALEMODE_FLOOR = 1;
m.SCALEMODE_NEAREST = 2;
m.SCALEMODE_CEILING = 3;
m.MATERIAL_TextureDirtyFlag = 1;
m.MATERIAL_LightDirtyFlag = 2;
m.MATERIAL_FresnelDirtyFlag = 4;
m.MATERIAL_AttributesDirtyFlag = 8;
m.MATERIAL_MiscDirtyFlag = 16;
m.MATERIAL_PrePassDirtyFlag = 32;
m.MATERIAL_AllDirtyFlag = 63;
m.MATERIAL_TriangleFillMode = 0;
m.MATERIAL_WireFrameFillMode = 1;
m.MATERIAL_PointFillMode = 2;
m.MATERIAL_PointListDrawMode = 3;
m.MATERIAL_LineListDrawMode = 4;
m.MATERIAL_LineLoopDrawMode = 5;
m.MATERIAL_LineStripDrawMode = 6;
m.MATERIAL_TriangleStripDrawMode = 7;
m.MATERIAL_TriangleFanDrawMode = 8;
m.MATERIAL_ClockWiseSideOrientation = 0;
m.MATERIAL_CounterClockWiseSideOrientation = 1;
m.ACTION_NothingTrigger = 0;
m.ACTION_OnPickTrigger = 1;
m.ACTION_OnLeftPickTrigger = 2;
m.ACTION_OnRightPickTrigger = 3;
m.ACTION_OnCenterPickTrigger = 4;
m.ACTION_OnPickDownTrigger = 5;
m.ACTION_OnDoublePickTrigger = 6;
m.ACTION_OnPickUpTrigger = 7;
m.ACTION_OnPickOutTrigger = 16;
m.ACTION_OnLongPressTrigger = 8;
m.ACTION_OnPointerOverTrigger = 9;
m.ACTION_OnPointerOutTrigger = 10;
m.ACTION_OnEveryFrameTrigger = 11;
m.ACTION_OnIntersectionEnterTrigger = 12;
m.ACTION_OnIntersectionExitTrigger = 13;
m.ACTION_OnKeyDownTrigger = 14;
m.ACTION_OnKeyUpTrigger = 15;
m.PARTICLES_BILLBOARDMODE_Y = 2;
m.PARTICLES_BILLBOARDMODE_ALL = 7;
m.PARTICLES_BILLBOARDMODE_STRETCHED = 8;
m.PARTICLES_BILLBOARDMODE_STRETCHED_LOCAL = 9;
m.MESHES_CULLINGSTRATEGY_STANDARD = 0;
m.MESHES_CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY = 1;
m.MESHES_CULLINGSTRATEGY_OPTIMISTIC_INCLUSION = 2;
m.MESHES_CULLINGSTRATEGY_OPTIMISTIC_INCLUSION_THEN_BSPHERE_ONLY = 3;
m.SCENELOADER_NO_LOGGING = 0;
m.SCENELOADER_MINIMAL_LOGGING = 1;
m.SCENELOADER_SUMMARY_LOGGING = 2;
m.SCENELOADER_DETAILED_LOGGING = 3;
m.PREPASS_IRRADIANCE_TEXTURE_TYPE = 0;
m.PREPASS_POSITION_TEXTURE_TYPE = 1;
m.PREPASS_VELOCITY_TEXTURE_TYPE = 2;
m.PREPASS_REFLECTIVITY_TEXTURE_TYPE = 3;
m.PREPASS_COLOR_TEXTURE_TYPE = 4;
m.PREPASS_DEPTH_TEXTURE_TYPE = 5;
m.PREPASS_NORMAL_TEXTURE_TYPE = 6;
m.PREPASS_ALBEDO_SQRT_TEXTURE_TYPE = 7;
m.BUFFER_CREATIONFLAG_READ = 1;
m.BUFFER_CREATIONFLAG_WRITE = 2;
m.BUFFER_CREATIONFLAG_READWRITE = 3;
m.BUFFER_CREATIONFLAG_UNIFORM = 4;
m.BUFFER_CREATIONFLAG_VERTEX = 8;
m.BUFFER_CREATIONFLAG_INDEX = 16;
m.BUFFER_CREATIONFLAG_STORAGE = 32;
m.RENDERPASS_MAIN = 0;
m.INPUT_ALT_KEY = 18;
m.INPUT_CTRL_KEY = 17;
m.INPUT_META_KEY1 = 91;
m.INPUT_META_KEY2 = 92;
m.INPUT_META_KEY3 = 93;
m.INPUT_SHIFT_KEY = 16;
m.SNAPSHOTRENDERING_STANDARD = 0;
m.SNAPSHOTRENDERING_FAST = 1;
m.PERSPECTIVE_CAMERA = 0;
m.ORTHOGRAPHIC_CAMERA = 1;
m.FOVMODE_VERTICAL_FIXED = 0;
m.FOVMODE_HORIZONTAL_FIXED = 1;
m.RIG_MODE_NONE = 0;
m.RIG_MODE_STEREOSCOPIC_ANAGLYPH = 10;
m.RIG_MODE_STEREOSCOPIC_SIDEBYSIDE_PARALLEL = 11;
m.RIG_MODE_STEREOSCOPIC_SIDEBYSIDE_CROSSEYED = 12;
m.RIG_MODE_STEREOSCOPIC_OVERUNDER = 13;
m.RIG_MODE_STEREOSCOPIC_INTERLACED = 14;
m.RIG_MODE_VR = 20;
m.RIG_MODE_WEBVR = 21;
m.RIG_MODE_CUSTOM = 22;
m.MAX_SUPPORTED_UV_SETS = 6;
m.GL_ALPHA_EQUATION_ADD = 32774;
m.GL_ALPHA_EQUATION_MIN = 32775;
m.GL_ALPHA_EQUATION_MAX = 32776;
m.GL_ALPHA_EQUATION_SUBTRACT = 32778;
m.GL_ALPHA_EQUATION_REVERSE_SUBTRACT = 32779;
m.GL_ALPHA_FUNCTION_SRC = 768;
m.GL_ALPHA_FUNCTION_ONE_MINUS_SRC_COLOR = 769;
m.GL_ALPHA_FUNCTION_SRC_ALPHA = 770;
m.GL_ALPHA_FUNCTION_ONE_MINUS_SRC_ALPHA = 771;
m.GL_ALPHA_FUNCTION_DST_ALPHA = 772;
m.GL_ALPHA_FUNCTION_ONE_MINUS_DST_ALPHA = 773;
m.GL_ALPHA_FUNCTION_DST_COLOR = 774;
m.GL_ALPHA_FUNCTION_ONE_MINUS_DST_COLOR = 775;
m.GL_ALPHA_FUNCTION_SRC_ALPHA_SATURATED = 776;
m.GL_ALPHA_FUNCTION_CONSTANT_COLOR = 32769;
m.GL_ALPHA_FUNCTION_ONE_MINUS_CONSTANT_COLOR = 32770;
m.GL_ALPHA_FUNCTION_CONSTANT_ALPHA = 32771;
m.GL_ALPHA_FUNCTION_ONE_MINUS_CONSTANT_ALPHA = 32772;
m.SnippetUrl = "https://snippet.babylonjs.com";
const Xl = "rgbdEncodePixelShader", Hl = `varying vec2 vUV;
uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{
gl_FragColor=toRGBD(texture2D(textureSampler,vUV).rgb);
}`;
C.ShadersStore[Xl] = Hl;
const kl = "image/png";
function xi(l, e, t, i, r, s, n, o, a, f, c) {
  return new Promise((d, E) => {
    if (t) {
      const u = e.createTexture(null, !0, !0, null, 1, null, (_) => {
        E(_);
      }, l);
      i.getEffect().executeWhenCompiled(() => {
        i.externalTextureSamplerBinding = !0, i.onApply = (_) => {
          _._bindTexture("textureSampler", u), _.setFloat2("scale", 1, e._features.needsInvertingBitmap && l instanceof ImageBitmap ? -1 : 1);
        }, e.scenes.length && (e.scenes[0].postProcessManager.directRender([i], f, !0, s, n), e.restoreDefaultFramebuffer(), u.dispose(), URL.revokeObjectURL(r), d());
      });
    } else {
      if (e._uploadImageToTexture(c, l, s, n), o) {
        const u = a[n];
        u && e._uploadImageToTexture(u._texture, l, s, 0);
      }
      d();
    }
  });
}
function Ni(l, e, t = kl) {
  if (!Me.IsExponentOfTwo(l.width))
    throw new Error("Texture size must be a power of two");
  const i = be.ILog2(l.width) + 1, r = l.getEngine();
  let s = !1, n = !1, o = null, a = null, f = null;
  const c = r.getCaps();
  if (l.format = 5, l.type = 0, l.generateMipMaps = !0, l._cachedAnisotropicFilteringLevel = null, r.updateTextureSamplingMode(3, l), c.textureLOD ? r._features.supportRenderAndCopyToLodForFloatTextures ? c.textureHalfFloatRender && c.textureHalfFloatLinearFiltering ? (s = !0, l.type = 2) : c.textureFloatRender && c.textureFloatLinearFiltering && (s = !0, l.type = 1) : s = !1 : (s = !1, n = !0, f = {}), s)
    o = new W("rgbdDecode", "rgbdDecode", null, null, 1, null, 3, r, !1, void 0, l.type, void 0, null, !1), l._isRGBD = !1, l.invertY = !1, a = r.createRenderTargetCubeTexture(l.width, {
      generateDepthBuffer: !1,
      generateMipMaps: !0,
      generateStencilBuffer: !1,
      samplingMode: 3,
      type: l.type,
      format: 5
    });
  else if (l._isRGBD = !0, l.invertY = !0, n) {
    const u = l._lodGenerationScale, _ = l._lodGenerationOffset;
    for (let p = 0; p < 3; p++) {
      const R = 1 - p / 2, N = _, O = (i - 1) * u + _, L = N + (O - N) * R, U = Math.round(Math.min(Math.max(L, 0), O)), y = new Je(r, Te.Temp);
      y.isCube = !0, y.invertY = !0, y.generateMipMaps = !1, r.updateTextureSamplingMode(2, y);
      const D = new Q(null);
      switch (D._isCube = !0, D._texture = y, f[U] = D, p) {
        case 0:
          l._lodTextureLow = D;
          break;
        case 1:
          l._lodTextureMid = D;
          break;
        case 2:
          l._lodTextureHigh = D;
          break;
      }
    }
  }
  const d = [];
  for (let E = 0; E < e.length; E++)
    for (let u = 0; u < 6; u++) {
      const _ = e[E][u], p = new Blob([_], { type: t }), A = URL.createObjectURL(p);
      let R;
      if (typeof Image > "u" || r._features.forceBitmapOverHTMLImageElement)
        R = r.createImageBitmap(p, { premultiplyAlpha: "none" }).then((N) => xi(N, r, s, o, A, u, E, n, f, a, l));
      else {
        const N = new Image();
        N.src = A, R = new Promise((O, L) => {
          N.onload = () => {
            xi(N, r, s, o, A, u, E, n, f, a, l).then(() => O()).catch((U) => {
              L(U);
            });
          }, N.onerror = (U) => {
            L(U);
          };
        });
      }
      d.push(R);
    }
  if (e.length < i) {
    let E;
    const u = Math.pow(2, i - 1 - e.length), _ = u * u * 4;
    switch (l.type) {
      case 0: {
        E = new Uint8Array(_);
        break;
      }
      case 2: {
        E = new Uint16Array(_);
        break;
      }
      case 1: {
        E = new Float32Array(_);
        break;
      }
    }
    for (let p = e.length; p < i; p++)
      for (let A = 0; A < 6; A++)
        r._uploadArrayBufferViewToTexture(l, E, A, p);
  }
  return Promise.all(d).then(() => {
    a && (r._releaseTexture(l), a._swapAndDie(l)), o && o.dispose(), n && (l._lodTextureHigh && l._lodTextureHigh._texture && (l._lodTextureHigh._texture.isReady = !0), l._lodTextureMid && l._lodTextureMid._texture && (l._lodTextureMid._texture.isReady = !0), l._lodTextureLow && l._lodTextureLow._texture && (l._lodTextureLow._texture.isReady = !0));
  });
}
function zl(l, e, t, i, r) {
  const s = l.getEngine().createRawCubeTexture(null, l.width, l.format, l.type, l.generateMipMaps, l.invertY, l.samplingMode, l._compression), n = Ni(s, e).then(() => l);
  return l.onRebuildCallback = (o) => ({
    proxy: n,
    isReady: !0,
    isAsync: !0
  }), l._source = Te.CubeRawRGBD, l._bufferViewArrayArray = e, l._lodGenerationScale = i, l._lodGenerationOffset = r, l._sphericalPolynomial = t, Ni(l, e).then(() => (l.isReady = !0, l));
}
q.prototype._createDepthStencilCubeTexture = function(l, e, t) {
  const i = new Je(this, Te.DepthStencil);
  if (i.isCube = !0, this.webGLVersion === 1)
    return pe.Error("Depth cube texture is not supported by WebGL 1."), i;
  const r = {
    bilinearFiltering: !1,
    comparisonFunction: 0,
    generateStencil: !1,
    ...e
  }, s = this._gl;
  this._bindTextureDirectly(s.TEXTURE_CUBE_MAP, i, !0), this._setupDepthStencilTexture(i, l, r.generateStencil, r.bilinearFiltering, r.comparisonFunction), t._depthStencilTexture = i, t._depthStencilTextureWithStencil = r.generateStencil;
  for (let n = 0; n < 6; n++)
    r.generateStencil ? s.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X + n, 0, s.DEPTH24_STENCIL8, l, l, 0, s.DEPTH_STENCIL, s.UNSIGNED_INT_24_8, null) : s.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X + n, 0, s.DEPTH_COMPONENT24, l, l, 0, s.DEPTH_COMPONENT, s.UNSIGNED_INT, null);
  return this._bindTextureDirectly(s.TEXTURE_CUBE_MAP, null), this._internalTexturesCache.push(i), i;
};
q.prototype._partialLoadFile = function(l, e, t, i, r = null) {
  const s = (o) => {
    t[e] = o, t._internalCount++, t._internalCount === 6 && i(t);
  }, n = (o, a) => {
    r && o && r(o.status + " " + o.statusText, a);
  };
  this._loadFile(l, s, void 0, void 0, !0, n);
};
q.prototype._cascadeLoadFiles = function(l, e, t, i = null) {
  const r = [];
  r._internalCount = 0;
  for (let s = 0; s < 6; s++)
    this._partialLoadFile(t[s], s, r, e, i);
};
q.prototype._cascadeLoadImgs = function(l, e, t, i, r = null, s) {
  const n = [];
  n._internalCount = 0;
  for (let o = 0; o < 6; o++)
    this._partialLoadImg(i[o], o, n, l, e, t, r, s);
};
q.prototype._partialLoadImg = function(l, e, t, i, r, s, n = null, o) {
  const a = Oi();
  or(l, (d) => {
    t[e] = d, t._internalCount++, i && i.removePendingData(a), t._internalCount === 6 && s && s(r, t);
  }, (d, E) => {
    i && i.removePendingData(a), n && n(d, E);
  }, i ? i.offlineProvider : null, o), i && i.addPendingData(a);
};
q.prototype._setCubeMapTextureParams = function(l, e, t) {
  const i = this._gl;
  i.texParameteri(i.TEXTURE_CUBE_MAP, i.TEXTURE_MAG_FILTER, i.LINEAR), i.texParameteri(i.TEXTURE_CUBE_MAP, i.TEXTURE_MIN_FILTER, e ? i.LINEAR_MIPMAP_LINEAR : i.LINEAR), i.texParameteri(i.TEXTURE_CUBE_MAP, i.TEXTURE_WRAP_S, i.CLAMP_TO_EDGE), i.texParameteri(i.TEXTURE_CUBE_MAP, i.TEXTURE_WRAP_T, i.CLAMP_TO_EDGE), l.samplingMode = e ? 3 : 2, e && this.getCaps().textureMaxLevel && t !== void 0 && t > 0 && (i.texParameteri(i.TEXTURE_CUBE_MAP, i.TEXTURE_MAX_LEVEL, t), l._maxLodLevel = t), this._bindTextureDirectly(i.TEXTURE_CUBE_MAP, null);
};
q.prototype.createCubeTextureBase = function(l, e, t, i, r = null, s = null, n, o = null, a = !1, f = 0, c = 0, d = null, E = null, u = null, _ = !1) {
  const p = d || new Je(this, Te.Cube);
  p.isCube = !0, p.url = l, p.generateMipMaps = !i, p._lodGenerationScale = f, p._lodGenerationOffset = c, p._useSRGBBuffer = !!_ && this._caps.supportSRGBBuffers && (this.webGLVersion > 1 || this.isWebGPU || !!i), p !== d && (p.label = l.substring(0, 60)), this._doNotHandleContextLost || (p._extension = o, p._files = t);
  const A = l;
  this._transformTextureUrl && !d && (l = this._transformTextureUrl(l));
  const R = l.split("?")[0], N = R.lastIndexOf("."), O = o || (N > -1 ? R.substring(N).toLowerCase() : "");
  let L = null;
  for (const y of q._TextureLoaders)
    if (y.canLoad(O)) {
      L = y;
      break;
    }
  const U = (y, D) => {
    l === A ? s && y && s(y.status + " " + y.statusText, D) : (pe.Warn(`Failed to load ${l}, falling back to the ${A}`), this.createCubeTextureBase(A, e, t, !!i, r, s, n, o, a, f, c, p, E, u, _));
  };
  if (L) {
    const y = (D) => {
      E && E(p, D), L.loadCubeData(D, p, a, r, s);
    };
    t && t.length === 6 ? L.supportCascades ? this._cascadeLoadFiles(e, (D) => y(D.map((w) => new Uint8Array(w))), t, s) : s ? s("Textures type does not support cascades.") : pe.Warn("Texture loader does not support cascades.") : this._loadFile(l, (D) => y(new Uint8Array(D)), void 0, void 0, !0, U);
  } else {
    if (!t)
      throw new Error("Cannot load cubemap because files were not defined");
    this._cascadeLoadImgs(e, p, (y, D) => {
      u && u(y, D);
    }, t, s);
  }
  return this._internalTexturesCache.push(p), p;
};
q.prototype.createCubeTexture = function(l, e, t, i, r = null, s = null, n, o = null, a = !1, f = 0, c = 0, d = null, E, u = !1) {
  const _ = this._gl;
  return this.createCubeTextureBase(l, e, t, !!i, r, s, n, o, a, f, c, d, (p) => this._bindTextureDirectly(_.TEXTURE_CUBE_MAP, p, !0), (p, A) => {
    const R = this.needPOTTextures ? q.GetExponentOfTwo(A[0].width, this._caps.maxCubemapTextureSize) : A[0].width, N = R, O = [
      _.TEXTURE_CUBE_MAP_POSITIVE_X,
      _.TEXTURE_CUBE_MAP_POSITIVE_Y,
      _.TEXTURE_CUBE_MAP_POSITIVE_Z,
      _.TEXTURE_CUBE_MAP_NEGATIVE_X,
      _.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      _.TEXTURE_CUBE_MAP_NEGATIVE_Z
    ];
    this._bindTextureDirectly(_.TEXTURE_CUBE_MAP, p, !0), this._unpackFlipY(!1);
    const L = n ? this._getInternalFormat(n, p._useSRGBBuffer) : p._useSRGBBuffer ? _.SRGB8_ALPHA8 : _.RGBA;
    let U = n ? this._getInternalFormat(n) : _.RGBA;
    p._useSRGBBuffer && this.webGLVersion === 1 && (U = L);
    for (let y = 0; y < O.length; y++)
      if (A[y].width !== R || A[y].height !== N) {
        if (this._prepareWorkingCanvas(), !this._workingCanvas || !this._workingContext) {
          pe.Warn("Cannot create canvas to resize texture.");
          return;
        }
        this._workingCanvas.width = R, this._workingCanvas.height = N, this._workingContext.drawImage(A[y], 0, 0, A[y].width, A[y].height, 0, 0, R, N), _.texImage2D(O[y], 0, L, U, _.UNSIGNED_BYTE, this._workingCanvas);
      } else
        _.texImage2D(O[y], 0, L, U, _.UNSIGNED_BYTE, A[y]);
    i || _.generateMipmap(_.TEXTURE_CUBE_MAP), this._setCubeMapTextureParams(p, !i), p.width = R, p.height = N, p.isReady = !0, n && (p.format = n), p.onLoadedObservable.notifyObservers(p), p.onLoadedObservable.clear(), r && r();
  }, !!u);
};
class he extends Q {
  /**
   * Gets or sets the size of the bounding box associated with the cube texture
   * When defined, the cubemap will switch to local mode
   * @see https://community.arm.com/graphics/b/blog/posts/reflections-based-on-local-cubemaps-in-unity
   * @example https://www.babylonjs-playground.com/#RNASML
   */
  set boundingBoxSize(e) {
    if (this._boundingBoxSize && this._boundingBoxSize.equals(e))
      return;
    this._boundingBoxSize = e;
    const t = this.getScene();
    t && t.markAllMaterialsAsDirty(1);
  }
  /**
   * Returns the bounding box size
   * @see https://doc.babylonjs.com/features/featuresDeepDive/materials/using/reflectionTexture#using-local-cubemap-mode
   */
  get boundingBoxSize() {
    return this._boundingBoxSize;
  }
  /**
   * Sets texture matrix rotation angle around Y axis in radians.
   */
  set rotationY(e) {
    this._rotationY = e, this.setReflectionTextureMatrix(B.RotationY(this._rotationY));
  }
  /**
   * Gets texture matrix rotation angle around Y axis radians.
   */
  get rotationY() {
    return this._rotationY;
  }
  /**
   * Are mip maps generated for this texture or not.
   */
  get noMipmap() {
    return this._noMipmap;
  }
  /**
   * Gets the forced extension (if any)
   */
  get forcedExtension() {
    return this._forcedExtension;
  }
  /**
   * Creates a cube texture from an array of image urls
   * @param files defines an array of image urls
   * @param scene defines the hosting scene
   * @param noMipmap specifies if mip maps are not used
   * @returns a cube texture
   */
  static CreateFromImages(e, t, i) {
    let r = "";
    return e.forEach((s) => r += s), new he(r, t, null, i, e);
  }
  /**
   * Creates and return a texture created from prefilterd data by tools like IBL Baker or Lys.
   * @param url defines the url of the prefiltered texture
   * @param scene defines the scene the texture is attached to
   * @param forcedExtension defines the extension of the file if different from the url
   * @param createPolynomials defines whether or not to create polynomial harmonics from the texture data if necessary
   * @returns the prefiltered texture
   */
  static CreateFromPrefilteredData(e, t, i = null, r = !0) {
    const s = t.useDelayedTextureLoading;
    t.useDelayedTextureLoading = !1;
    const n = new he(e, t, null, !1, null, null, null, void 0, !0, i, r);
    return t.useDelayedTextureLoading = s, n;
  }
  /**
   * Creates a cube texture to use with reflection for instance. It can be based upon dds or six images as well
   * as prefiltered data.
   * @param rootUrl defines the url of the texture or the root name of the six images
   * @param sceneOrEngine defines the scene or engine the texture is attached to
   * @param extensions defines the suffixes add to the picture name in case six images are in use like _px.jpg...
   * @param noMipmap defines if mipmaps should be created or not
   * @param files defines the six files to load for the different faces in that order: px, py, pz, nx, ny, nz
   * @param onLoad defines a callback triggered at the end of the file load if no errors occurred
   * @param onError defines a callback triggered in case of error during load
   * @param format defines the internal format to use for the texture once loaded
   * @param prefiltered defines whether or not the texture is created from prefiltered data
   * @param forcedExtension defines the extensions to use (force a special type of file to load) in case it is different from the file name
   * @param createPolynomials defines whether or not to create polynomial harmonics from the texture data if necessary
   * @param lodScale defines the scale applied to environment texture. This manages the range of LOD level used for IBL according to the roughness
   * @param lodOffset defines the offset applied to environment texture. This manages first LOD level used for IBL according to the roughness
   * @param loaderOptions options to be passed to the loader
   * @param useSRGBBuffer Defines if the texture must be loaded in a sRGB GPU buffer (if supported by the GPU) (default: false)
   * @returns the cube texture
   */
  constructor(e, t, i = null, r = !1, s = null, n = null, o = null, a = 5, f = !1, c = null, d = !1, E = 0.8, u = 0, _, p) {
    var A;
    super(t), this._lodScale = 0.8, this._lodOffset = 0, this.onLoadObservable = new $(), this.boundingBoxPosition = g.Zero(), this._rotationY = 0, this._files = null, this._forcedExtension = null, this._extensions = null, this.name = e, this.url = e, this._noMipmap = r, this.hasAlpha = !1, this._format = a, this.isCube = !0, this._textureMatrix = B.Identity(), this._createPolynomials = d, this.coordinatesMode = I.CUBIC_MODE, this._extensions = i, this._files = s, this._forcedExtension = c, this._loaderOptions = _, this._useSRGBBuffer = p, this._lodScale = E, this._lodOffset = u, !(!e && !s) && this.updateURL(e, c, n, f, o, i, (A = this.getScene()) === null || A === void 0 ? void 0 : A.useDelayedTextureLoading, s);
  }
  /**
   * Get the current class name of the texture useful for serialization or dynamic coding.
   * @returns "CubeTexture"
   */
  getClassName() {
    return "CubeTexture";
  }
  /**
   * Update the url (and optional buffer) of this texture if url was null during construction.
   * @param url the url of the texture
   * @param forcedExtension defines the extension to use
   * @param onLoad callback called when the texture is loaded  (defaults to null)
   * @param prefiltered Defines whether the updated texture is prefiltered or not
   * @param onError callback called if there was an error during the loading process (defaults to null)
   * @param extensions defines the suffixes add to the picture name in case six images are in use like _px.jpg...
   * @param delayLoad defines if the texture should be loaded now (false by default)
   * @param files defines the six files to load for the different faces in that order: px, py, pz, nx, ny, nz
   */
  updateURL(e, t, i = null, r = !1, s = null, n = null, o = !1, a = null) {
    (!this.name || this.name.startsWith("data:")) && (this.name = e), this.url = e, t && (this._forcedExtension = t);
    const f = e.lastIndexOf("."), c = t || (f > -1 ? e.substring(f).toLowerCase() : ""), d = c.indexOf(".dds") === 0, E = c.indexOf(".env") === 0, u = c.indexOf(".basis") === 0;
    if (E ? (this.gammaSpace = !1, this._prefiltered = !1, this.anisotropicFilteringLevel = 1) : (this._prefiltered = r, r && (this.gammaSpace = !1, this.anisotropicFilteringLevel = 1)), a)
      this._files = a;
    else if (!u && !E && !d && !n && (n = ["_px.jpg", "_py.jpg", "_pz.jpg", "_nx.jpg", "_ny.jpg", "_nz.jpg"]), this._files = this._files || [], this._files.length = 0, n) {
      for (let _ = 0; _ < n.length; _++)
        this._files.push(e + n[_]);
      this._extensions = n;
    }
    o ? (this.delayLoadState = 4, this._delayedOnLoad = i, this._delayedOnError = s) : this._loadTexture(i, s);
  }
  /**
   * Delays loading of the cube texture
   * @param forcedExtension defines the extension to use
   */
  delayLoad(e) {
    this.delayLoadState === 4 && (e && (this._forcedExtension = e), this.delayLoadState = 1, this._loadTexture(this._delayedOnLoad, this._delayedOnError));
  }
  /**
   * Returns the reflection texture matrix
   * @returns the reflection texture matrix
   */
  getReflectionTextureMatrix() {
    return this._textureMatrix;
  }
  /**
   * Sets the reflection texture matrix
   * @param value Reflection texture matrix
   */
  setReflectionTextureMatrix(e) {
    var t;
    e.updateFlag !== this._textureMatrix.updateFlag && (e.isIdentity() !== this._textureMatrix.isIdentity() && ((t = this.getScene()) === null || t === void 0 || t.markAllMaterialsAsDirty(1, (i) => i.getActiveTextures().indexOf(this) !== -1)), this._textureMatrix = e);
  }
  _loadTexture(e = null, t = null) {
    var i;
    const r = this.getScene(), s = this._texture;
    this._texture = this._getFromCache(this.url, this._noMipmap, void 0, void 0, this._useSRGBBuffer, this.isCube);
    const n = () => {
      var a;
      this.onLoadObservable.notifyObservers(this), s && (s.dispose(), (a = this.getScene()) === null || a === void 0 || a.markAllMaterialsAsDirty(1)), e && e();
    }, o = (a, f) => {
      this._loadingError = !0, this._errorObject = { message: a, exception: f }, t && t(a, f), I.OnTextureLoadErrorObservable.notifyObservers(this);
    };
    this._texture ? this._texture.isReady ? Me.SetImmediate(() => n()) : this._texture.onLoadedObservable.add(() => n()) : (this._prefiltered ? this._texture = this._getEngine().createPrefilteredCubeTexture(this.url, r, this._lodScale, this._lodOffset, e, o, this._format, this._forcedExtension, this._createPolynomials) : this._texture = this._getEngine().createCubeTexture(this.url, r, this._files, this._noMipmap, e, o, this._format, this._forcedExtension, !1, this._lodScale, this._lodOffset, null, this._loaderOptions, !!this._useSRGBBuffer), (i = this._texture) === null || i === void 0 || i.onLoadedObservable.add(() => this.onLoadObservable.notifyObservers(this)));
  }
  /**
   * Parses text to create a cube texture
   * @param parsedTexture define the serialized text to read from
   * @param scene defines the hosting scene
   * @param rootUrl defines the root url of the cube texture
   * @returns a cube texture
   */
  static Parse(e, t, i) {
    const r = j.Parse(() => {
      let s = !1;
      return e.prefiltered && (s = e.prefiltered), new he(i + e.name, t, e.extensions, !1, e.files || null, null, null, void 0, s, e.forcedExtension);
    }, e, t);
    if (e.boundingBoxPosition && (r.boundingBoxPosition = g.FromArray(e.boundingBoxPosition)), e.boundingBoxSize && (r.boundingBoxSize = g.FromArray(e.boundingBoxSize)), e.animations)
      for (let s = 0; s < e.animations.length; s++) {
        const n = e.animations[s], o = Gt("BABYLON.Animation");
        o && r.animations.push(o.Parse(n));
      }
    return r;
  }
  /**
   * Makes a clone, or deep copy, of the cube texture
   * @returns a new cube texture
   */
  clone() {
    let e = 0;
    const t = j.Clone(() => {
      const i = new he(this.url, this.getScene() || this._getEngine(), this._extensions, this._noMipmap, this._files);
      return e = i.uniqueId, i;
    }, this);
    return t.uniqueId = e, t;
  }
}
h([
  T()
], he.prototype, "url", void 0);
h([
  mt()
], he.prototype, "boundingBoxPosition", void 0);
h([
  mt()
], he.prototype, "boundingBoxSize", null);
h([
  T("rotationY")
], he.prototype, "rotationY", null);
h([
  T("files")
], he.prototype, "_files", void 0);
h([
  T("forcedExtension")
], he.prototype, "_forcedExtension", void 0);
h([
  T("extensions")
], he.prototype, "_extensions", void 0);
h([
  lr("textureMatrix")
], he.prototype, "_textureMatrix", void 0);
I._CubeTextureParser = he.Parse;
Fe("BABYLON.CubeTexture", he);
q.prototype.updateRawTexture = function(l, e, t, i, r = null, s = 0, n = !1) {
  if (!l)
    return;
  const o = this._getRGBABufferInternalSizedFormat(s, t, n), a = this._getInternalFormat(t), f = this._getWebGLTextureType(s);
  this._bindTextureDirectly(this._gl.TEXTURE_2D, l, !0), this._unpackFlipY(i === void 0 ? !0 : !!i), this._doNotHandleContextLost || (l._bufferView = e, l.format = t, l.type = s, l.invertY = i, l._compression = r), l.width % 4 !== 0 && this._gl.pixelStorei(this._gl.UNPACK_ALIGNMENT, 1), r && e ? this._gl.compressedTexImage2D(this._gl.TEXTURE_2D, 0, this.getCaps().s3tc[r], l.width, l.height, 0, e) : this._gl.texImage2D(this._gl.TEXTURE_2D, 0, o, l.width, l.height, 0, a, f, e), l.generateMipMaps && this._gl.generateMipmap(this._gl.TEXTURE_2D), this._bindTextureDirectly(this._gl.TEXTURE_2D, null), l.isReady = !0;
};
q.prototype.createRawTexture = function(l, e, t, i, r, s, n, o = null, a = 0, f = 0, c = !1) {
  const d = new Je(this, Te.Raw);
  d.baseWidth = e, d.baseHeight = t, d.width = e, d.height = t, d.format = i, d.generateMipMaps = r, d.samplingMode = n, d.invertY = s, d._compression = o, d.type = a, d._useSRGBBuffer = this._getUseSRGBBuffer(c, !r), this._doNotHandleContextLost || (d._bufferView = l), this.updateRawTexture(d, l, i, s, o, a, d._useSRGBBuffer), this._bindTextureDirectly(this._gl.TEXTURE_2D, d, !0);
  const E = this._getSamplingParameters(n, r);
  return this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MAG_FILTER, E.mag), this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MIN_FILTER, E.min), r && this._gl.generateMipmap(this._gl.TEXTURE_2D), this._bindTextureDirectly(this._gl.TEXTURE_2D, null), this._internalTexturesCache.push(d), d;
};
q.prototype.createRawCubeTexture = function(l, e, t, i, r, s, n, o = null) {
  const a = this._gl, f = new Je(this, Te.CubeRaw);
  f.isCube = !0, f.format = t, f.type = i, this._doNotHandleContextLost || (f._bufferViewArray = l);
  const c = this._getWebGLTextureType(i);
  let d = this._getInternalFormat(t);
  d === a.RGB && (d = a.RGBA), c === a.FLOAT && !this._caps.textureFloatLinearFiltering ? (r = !1, n = 1, pe.Warn("Float texture filtering is not supported. Mipmap generation and sampling mode are forced to false and TEXTURE_NEAREST_SAMPLINGMODE, respectively.")) : c === this._gl.HALF_FLOAT_OES && !this._caps.textureHalfFloatLinearFiltering ? (r = !1, n = 1, pe.Warn("Half float texture filtering is not supported. Mipmap generation and sampling mode are forced to false and TEXTURE_NEAREST_SAMPLINGMODE, respectively.")) : c === a.FLOAT && !this._caps.textureFloatRender ? (r = !1, pe.Warn("Render to float textures is not supported. Mipmap generation forced to false.")) : c === a.HALF_FLOAT && !this._caps.colorBufferFloat && (r = !1, pe.Warn("Render to half float textures is not supported. Mipmap generation forced to false."));
  const E = e, u = E;
  if (f.width = E, f.height = u, f.invertY = s, f._compression = o, !this.needPOTTextures || Me.IsExponentOfTwo(f.width) && Me.IsExponentOfTwo(f.height) || (r = !1), l)
    this.updateRawCubeTexture(f, l, t, i, s, o);
  else {
    const A = this._getRGBABufferInternalSizedFormat(i), R = 0;
    this._bindTextureDirectly(a.TEXTURE_CUBE_MAP, f, !0);
    for (let N = 0; N < 6; N++)
      o ? a.compressedTexImage2D(a.TEXTURE_CUBE_MAP_POSITIVE_X + N, R, this.getCaps().s3tc[o], f.width, f.height, 0, void 0) : a.texImage2D(a.TEXTURE_CUBE_MAP_POSITIVE_X + N, R, A, f.width, f.height, 0, d, c, null);
    this._bindTextureDirectly(this._gl.TEXTURE_CUBE_MAP, null);
  }
  this._bindTextureDirectly(this._gl.TEXTURE_CUBE_MAP, f, !0), l && r && this._gl.generateMipmap(this._gl.TEXTURE_CUBE_MAP);
  const p = this._getSamplingParameters(n, r);
  return a.texParameteri(a.TEXTURE_CUBE_MAP, a.TEXTURE_MAG_FILTER, p.mag), a.texParameteri(a.TEXTURE_CUBE_MAP, a.TEXTURE_MIN_FILTER, p.min), a.texParameteri(a.TEXTURE_CUBE_MAP, a.TEXTURE_WRAP_S, a.CLAMP_TO_EDGE), a.texParameteri(a.TEXTURE_CUBE_MAP, a.TEXTURE_WRAP_T, a.CLAMP_TO_EDGE), this._bindTextureDirectly(a.TEXTURE_CUBE_MAP, null), f.generateMipMaps = r, f.samplingMode = n, f.isReady = !0, f;
};
q.prototype.updateRawCubeTexture = function(l, e, t, i, r, s = null, n = 0) {
  l._bufferViewArray = e, l.format = t, l.type = i, l.invertY = r, l._compression = s;
  const o = this._gl, a = this._getWebGLTextureType(i);
  let f = this._getInternalFormat(t);
  const c = this._getRGBABufferInternalSizedFormat(i);
  let d = !1;
  f === o.RGB && (f = o.RGBA, d = !0), this._bindTextureDirectly(o.TEXTURE_CUBE_MAP, l, !0), this._unpackFlipY(r === void 0 ? !0 : !!r), l.width % 4 !== 0 && o.pixelStorei(o.UNPACK_ALIGNMENT, 1);
  for (let u = 0; u < 6; u++) {
    let _ = e[u];
    s ? o.compressedTexImage2D(o.TEXTURE_CUBE_MAP_POSITIVE_X + u, n, this.getCaps().s3tc[s], l.width, l.height, 0, _) : (d && (_ = Hi(_, l.width, l.height, i)), o.texImage2D(o.TEXTURE_CUBE_MAP_POSITIVE_X + u, n, c, l.width, l.height, 0, f, a, _));
  }
  (!this.needPOTTextures || Me.IsExponentOfTwo(l.width) && Me.IsExponentOfTwo(l.height)) && l.generateMipMaps && n === 0 && this._gl.generateMipmap(this._gl.TEXTURE_CUBE_MAP), this._bindTextureDirectly(this._gl.TEXTURE_CUBE_MAP, null), l.isReady = !0;
};
q.prototype.createRawCubeTextureFromUrl = function(l, e, t, i, r, s, n, o, a = null, f = null, c = 3, d = !1) {
  const E = this._gl, u = this.createRawCubeTexture(null, t, i, r, !s, d, c, null);
  e == null || e.addPendingData(u), u.url = l, this._internalTexturesCache.push(u);
  const _ = (A, R) => {
    e == null || e.removePendingData(u), f && A && f(A.status + " " + A.statusText, R);
  }, p = (A) => {
    const R = u.width, N = n(A);
    if (N) {
      if (o) {
        const O = this._getWebGLTextureType(r);
        let L = this._getInternalFormat(i);
        const U = this._getRGBABufferInternalSizedFormat(r);
        let y = !1;
        L === E.RGB && (L = E.RGBA, y = !0), this._bindTextureDirectly(E.TEXTURE_CUBE_MAP, u, !0), this._unpackFlipY(!1);
        const D = o(N);
        for (let w = 0; w < D.length; w++) {
          const X = R >> w;
          for (let H = 0; H < 6; H++) {
            let Ae = D[w][H];
            y && (Ae = Hi(Ae, X, X, r)), E.texImage2D(H, w, U, X, X, 0, L, O, Ae);
          }
        }
        this._bindTextureDirectly(E.TEXTURE_CUBE_MAP, null);
      } else
        this.updateRawCubeTexture(u, N, i, r, d);
      u.isReady = !0, e == null || e.removePendingData(u), u.onLoadedObservable.notifyObservers(u), u.onLoadedObservable.clear(), a && a();
    }
  };
  return this._loadFile(l, (A) => {
    p(A);
  }, void 0, e == null ? void 0 : e.offlineProvider, !0, _), u;
};
function Hi(l, e, t, i) {
  let r, s = 1;
  i === 1 ? r = new Float32Array(e * t * 4) : i === 2 ? (r = new Uint16Array(e * t * 4), s = 15360) : i === 7 ? r = new Uint32Array(e * t * 4) : r = new Uint8Array(e * t * 4);
  for (let n = 0; n < e; n++)
    for (let o = 0; o < t; o++) {
      const a = (o * e + n) * 3, f = (o * e + n) * 4;
      r[f + 0] = l[a + 0], r[f + 1] = l[a + 1], r[f + 2] = l[a + 2], r[f + 3] = s;
    }
  return r;
}
function ki(l) {
  return function(e, t, i, r, s, n, o, a, f = null, c = 0) {
    const d = l ? this._gl.TEXTURE_3D : this._gl.TEXTURE_2D_ARRAY, E = l ? Te.Raw3D : Te.Raw2DArray, u = new Je(this, E);
    u.baseWidth = t, u.baseHeight = i, u.baseDepth = r, u.width = t, u.height = i, u.depth = r, u.format = s, u.type = c, u.generateMipMaps = n, u.samplingMode = a, l ? u.is3D = !0 : u.is2DArray = !0, this._doNotHandleContextLost || (u._bufferView = e), l ? this.updateRawTexture3D(u, e, s, o, f, c) : this.updateRawTexture2DArray(u, e, s, o, f, c), this._bindTextureDirectly(d, u, !0);
    const _ = this._getSamplingParameters(a, n);
    return this._gl.texParameteri(d, this._gl.TEXTURE_MAG_FILTER, _.mag), this._gl.texParameteri(d, this._gl.TEXTURE_MIN_FILTER, _.min), n && this._gl.generateMipmap(d), this._bindTextureDirectly(d, null), this._internalTexturesCache.push(u), u;
  };
}
q.prototype.createRawTexture2DArray = ki(!1);
q.prototype.createRawTexture3D = ki(!0);
function zi(l) {
  return function(e, t, i, r, s = null, n = 0) {
    const o = l ? this._gl.TEXTURE_3D : this._gl.TEXTURE_2D_ARRAY, a = this._getWebGLTextureType(n), f = this._getInternalFormat(i), c = this._getRGBABufferInternalSizedFormat(n, i);
    this._bindTextureDirectly(o, e, !0), this._unpackFlipY(r === void 0 ? !0 : !!r), this._doNotHandleContextLost || (e._bufferView = t, e.format = i, e.invertY = r, e._compression = s), e.width % 4 !== 0 && this._gl.pixelStorei(this._gl.UNPACK_ALIGNMENT, 1), s && t ? this._gl.compressedTexImage3D(o, 0, this.getCaps().s3tc[s], e.width, e.height, e.depth, 0, t) : this._gl.texImage3D(o, 0, c, e.width, e.height, e.depth, 0, f, a, t), e.generateMipMaps && this._gl.generateMipmap(o), this._bindTextureDirectly(o, null), e.isReady = !0;
  };
}
q.prototype.updateRawTexture2DArray = zi(!1);
q.prototype.updateRawTexture3D = zi(!0);
class hi extends he {
  /**
   * Creates a cube texture where the raw buffers are passed in.
   * @param scene defines the scene the texture is attached to
   * @param data defines the array of data to use to create each face
   * @param size defines the size of the textures
   * @param format defines the format of the data
   * @param type defines the type of the data (like Engine.TEXTURETYPE_UNSIGNED_INT)
   * @param generateMipMaps  defines if the engine should generate the mip levels
   * @param invertY defines if data must be stored with Y axis inverted
   * @param samplingMode defines the required sampling mode (like Texture.NEAREST_SAMPLINGMODE)
   * @param compression defines the compression used (null by default)
   */
  constructor(e, t, i, r = 5, s = 0, n = !1, o = !1, a = 3, f = null) {
    super("", e), this._texture = e.getEngine().createRawCubeTexture(t, i, r, s, n, o, a, f);
  }
  /**
   * Updates the raw cube texture.
   * @param data defines the data to store
   * @param format defines the data format
   * @param type defines the type fo the data (Engine.TEXTURETYPE_UNSIGNED_INT by default)
   * @param invertY defines if data must be stored with Y axis inverted
   * @param compression defines the compression used (null by default)
   */
  update(e, t, i, r, s = null) {
    this._texture.getEngine().updateRawCubeTexture(this._texture, e, t, i, r, s);
  }
  /**
   * Updates a raw cube texture with RGBD encoded data.
   * @param data defines the array of data [mipmap][face] to use to create each face
   * @param sphericalPolynomial defines the spherical polynomial for irradiance
   * @param lodScale defines the scale applied to environment texture. This manages the range of LOD level used for IBL according to the roughness
   * @param lodOffset defines the offset applied to environment texture. This manages first LOD level used for IBL according to the roughness
   * @returns a promise that resolves when the operation is complete
   */
  updateRGBDAsync(e, t = null, i = 0.8, r = 0) {
    return zl(this._texture, e, t, i, r).then(() => {
    });
  }
  /**
   * Clones the raw cube texture.
   * @returns a new cube texture
   */
  clone() {
    return j.Clone(() => {
      const e = this.getScene(), t = this._texture, i = new hi(e, t._bufferViewArray, t.width, t.format, t.type, t.generateMipMaps, t.invertY, t.samplingMode, t._compression);
      return t.source === Te.CubeRawRGBD && i.updateRGBDAsync(t._bufferViewArrayArray, t._sphericalPolynomial, t._lodGenerationScale, t._lodGenerationOffset), i;
    }, this);
  }
}
const Wl = "hdrFilteringVertexShader", Yl = `attribute vec2 position;
varying vec3 direction;
uniform vec3 up;
uniform vec3 right;
uniform vec3 front;
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
mat3 view=mat3(up,right,front);
direction=view*vec3(position,1.0);
gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;
C.ShadersStore[Wl] = Yl;
const Ql = "hdrFilteringPixelShader", Kl = `#include<helperFunctions>
#include<importanceSampling>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
uniform float alphaG;
uniform samplerCube inputTexture;
uniform vec2 vFilteringInfo;
uniform float hdrScale;
varying vec3 direction;
void main() {
vec3 color=radiance(alphaG,inputTexture,direction,vFilteringInfo);
gl_FragColor=vec4(color*hdrScale,1.0);
}`;
C.ShadersStore[Ql] = Kl;
class Zl {
  /**
   * Instantiates HDR filter for reflection maps
   *
   * @param engine Thin engine
   * @param options Options
   */
  constructor(e, t = {}) {
    this._lodGenerationOffset = 0, this._lodGenerationScale = 0.8, this.quality = 4096, this.hdrScale = 1, this._engine = e, this.hdrScale = t.hdrScale || this.hdrScale, this.quality = t.quality || this.quality;
  }
  _createRenderTarget(e) {
    let t = 0;
    this._engine.getCaps().textureHalfFloatRender ? t = 2 : this._engine.getCaps().textureFloatRender && (t = 1);
    const i = this._engine.createRenderTargetCubeTexture(e, {
      format: 5,
      type: t,
      createMipMaps: !0,
      generateMipMaps: !1,
      generateDepthBuffer: !1,
      generateStencilBuffer: !1,
      samplingMode: 1
    });
    return this._engine.updateTextureWrappingMode(i.texture, 0, 0, 0), this._engine.updateTextureSamplingMode(3, i.texture, !0), i;
  }
  _prefilterInternal(e) {
    const t = e.getSize().width, i = be.ILog2(t) + 1, r = this._effectWrapper.effect, s = this._createRenderTarget(t);
    this._effectRenderer.setViewport();
    const n = e.getInternalTexture();
    n && this._engine.updateTextureSamplingMode(3, n, !0), this._effectRenderer.applyEffectWrapper(this._effectWrapper);
    const o = [
      [new g(0, 0, -1), new g(0, -1, 0), new g(1, 0, 0)],
      [new g(0, 0, 1), new g(0, -1, 0), new g(-1, 0, 0)],
      [new g(1, 0, 0), new g(0, 0, 1), new g(0, 1, 0)],
      [new g(1, 0, 0), new g(0, 0, -1), new g(0, -1, 0)],
      [new g(1, 0, 0), new g(0, -1, 0), new g(0, 0, 1)],
      [new g(-1, 0, 0), new g(0, -1, 0), new g(0, 0, -1)]
      // NegativeZ
    ];
    r.setFloat("hdrScale", this.hdrScale), r.setFloat2("vFilteringInfo", e.getSize().width, i), r.setTexture("inputTexture", e);
    for (let c = 0; c < 6; c++) {
      r.setVector3("up", o[c][0]), r.setVector3("right", o[c][1]), r.setVector3("front", o[c][2]);
      for (let d = 0; d < i; d++) {
        this._engine.bindFramebuffer(s, c, void 0, void 0, !0, d), this._effectRenderer.applyEffectWrapper(this._effectWrapper);
        let E = Math.pow(2, (d - this._lodGenerationOffset) / this._lodGenerationScale) / t;
        d === 0 && (E = 0), r.setFloat("alphaG", E), this._effectRenderer.draw();
      }
    }
    this._effectRenderer.restoreStates(), this._engine.restoreDefaultFramebuffer(), this._engine._releaseTexture(e._texture);
    const a = s.texture.type, f = s.texture.format;
    return s._swapAndDie(e._texture), e._texture.type = a, e._texture.format = f, e.gammaSpace = !1, e.lodGenerationOffset = this._lodGenerationOffset, e.lodGenerationScale = this._lodGenerationScale, e._prefiltered = !0, e;
  }
  _createEffect(e, t) {
    const i = [];
    return e.gammaSpace && i.push("#define GAMMA_INPUT"), i.push("#define NUM_SAMPLES " + this.quality + "u"), new Ui({
      engine: this._engine,
      name: "hdrFiltering",
      vertexShader: "hdrFiltering",
      fragmentShader: "hdrFiltering",
      samplerNames: ["inputTexture"],
      uniformNames: ["vSampleDirections", "vWeights", "up", "right", "front", "vFilteringInfo", "hdrScale", "alphaG"],
      useShaderStore: !0,
      defines: i,
      onCompiled: t
    });
  }
  /**
   * Get a value indicating if the filter is ready to be used
   * @param texture Texture to filter
   * @returns true if the filter is ready
   */
  isReady(e) {
    return e.isReady() && this._effectWrapper.effect.isReady();
  }
  /**
   * Prefilters a cube texture to have mipmap levels representing roughness values.
   * Prefiltering will be invoked at the end of next rendering pass.
   * This has to be done once the map is loaded, and has not been prefiltered by a third party software.
   * See http://blog.selfshadow.com/publications/s2013-shading-course/karis/s2013_pbs_epic_notes_v2.pdf for more information
   * @param texture Texture to filter
   * @param onFinished Callback when filtering is done
   * @returns Promise called when prefiltering is done
   */
  prefilter(e, t = null) {
    return this._engine._features.allowTexturePrefiltering ? new Promise((i) => {
      this._effectRenderer = new yi(this._engine), this._effectWrapper = this._createEffect(e), this._effectWrapper.effect.executeWhenCompiled(() => {
        this._prefilterInternal(e), this._effectRenderer.dispose(), this._effectWrapper.dispose(), i(), t && t();
      });
    }) : (pe.Warn("HDR prefiltering is not available in WebGL 1., you can use real time filtering instead."), Promise.reject("HDR prefiltering is not available in WebGL 1., you can use real time filtering instead."));
  }
}
const Ye = 128, ri = ui([0.3, 1, -0.4]), si = ui([-0.7, 0.55, 0.45]);
function ui([l, e, t]) {
  const i = Math.hypot(l, e, t) || 1;
  return [l / i, e / i, t / i];
}
function Tt(l, e, t) {
  const i = Math.min(1, Math.max(0, (t - l) / (e - l)));
  return i * i * (3 - 2 * i);
}
function jl([l, e, t]) {
  const i = e >= 0 ? 0.075 + 0.08 * e : 0.035, r = Tt(0.82, 0.92, l * ri[0] + e * ri[1] + t * ri[2]), s = Tt(0.86, 0.94, l * si[0] + e * si[1] + t * si[2]), n = Math.atan2(t, l), a = Tt(0.02, 0.08, e) * (1 - Tt(0.24, 0.32, e)) * Tt(0.35, 0.75, Math.cos(3 * n + 0.6));
  return [
    Math.min(1, i + r * 1 + s * 0.6 + a * 0.55),
    Math.min(1, i + r * 0.95 + s * 0.66 + a * 0.55),
    Math.min(1, i + r * 0.86 + s * 0.76 + a * 0.58)
  ];
}
const ql = [
  (l, e) => [1, -e, -l],
  (l, e) => [-1, -e, l],
  (l, e) => [l, 1, e],
  (l, e) => [l, -1, -e],
  (l, e) => [l, -e, 1],
  (l, e) => [-l, -e, -1]
];
function Jl(l) {
  const e = ql.map((i) => {
    const r = new Uint8Array(Ye * Ye * 4);
    for (let s = 0; s < Ye; s++)
      for (let n = 0; n < Ye; n++) {
        const o = (n + 0.5) / Ye * 2 - 1, a = (s + 0.5) / Ye * 2 - 1, [f, c, d] = jl(ui(i(o, a))), E = (s * Ye + n) * 4;
        r[E] = Math.round(Math.pow(f, 0.45454545454545453) * 255), r[E + 1] = Math.round(Math.pow(c, 0.45454545454545453) * 255), r[E + 2] = Math.round(Math.pow(d, 0.45454545454545453) * 255), r[E + 3] = 255;
      }
    return r;
  }), t = new hi(
    l,
    e,
    Ye,
    m.TEXTUREFORMAT_RGBA,
    m.TEXTURETYPE_UNSIGNED_BYTE,
    !0,
    !1,
    m.TEXTURE_TRILINEAR_SAMPLINGMODE
  );
  t.gammaSpace = !0;
  try {
    new Zl(l.getEngine(), {
      quality: m.TEXTURE_FILTERING_QUALITY_HIGH
    }).prefilter(t).then(() => l.markAllMaterialsAsDirty(m.MATERIAL_TextureDirtyFlag)).catch(() => {
    });
  } catch {
  }
  return t;
}
qe.prototype.clone = function(l) {
  const e = this, t = j.Clone(() => new qe(l, this.getScene()), this);
  return t.name = l, t.id = l, t.CustomParts.Fragment_Begin = e.CustomParts.Fragment_Begin, t.CustomParts.Fragment_Definitions = e.CustomParts.Fragment_Definitions, t.CustomParts.Fragment_MainBegin = e.CustomParts.Fragment_MainBegin, t.CustomParts.Fragment_Custom_Diffuse = e.CustomParts.Fragment_Custom_Diffuse, t.CustomParts.Fragment_Before_Lights = e.CustomParts.Fragment_Before_Lights, t.CustomParts.Fragment_Before_Fog = e.CustomParts.Fragment_Before_Fog, t.CustomParts.Fragment_Custom_Alpha = e.CustomParts.Fragment_Custom_Alpha, t.CustomParts.Fragment_Before_FragColor = e.CustomParts.Fragment_Before_FragColor, t.CustomParts.Vertex_Begin = e.CustomParts.Vertex_Begin, t.CustomParts.Vertex_Definitions = e.CustomParts.Vertex_Definitions, t.CustomParts.Vertex_MainBegin = e.CustomParts.Vertex_MainBegin, t.CustomParts.Vertex_Before_PositionUpdated = e.CustomParts.Vertex_Before_PositionUpdated, t.CustomParts.Vertex_Before_NormalUpdated = e.CustomParts.Vertex_Before_NormalUpdated, t.CustomParts.Vertex_After_WorldPosComputed = e.CustomParts.Vertex_After_WorldPosComputed, t.CustomParts.Vertex_MainEnd = e.CustomParts.Vertex_MainEnd, t;
};
tt.ShaderIndexer = 1e6;
class $l {
  constructor(e) {
    We(this, "loadedThemes", {});
    We(this, "themeData", {});
    this.scene = e.scene;
  }
  async loadStandardMaterial(e) {
    const { theme: t, material: i } = e, r = new x(t, this.scene);
    i.diffuseTexture && (r.diffuseTexture = await this.getTexture("diffuse", e)), i.bumpTexture && (r.bumpTexture = await this.getTexture("bump", e)), i.specularTexture && (r.specularTexture = await this.getTexture("specular", e)), r.allowShaderHotSwapping = !1;
  }
  // Grimoire Tales: the "color" material, lit physically. Same two materials
  // under the same two names, and the same per-instance colour, so nothing
  // outside this file can tell the difference - what changes is that the
  // surface is described as metal or not and rough or smooth (a glTF-style
  // map: red occlusion, green roughness, blue metalness), and that it reflects
  // the room in environment.js.
  async loadPbrColorMaterial(e) {
    const { theme: t, material: i } = e;
    this.scene.environmentTexture || (this.scene.environmentTexture = Jl(this.scene));
    const r = mi(e), s = i.bumpTexture ? await this.getTexture("bump", e) : null, n = i.metallicTexture ? await this.getTexture("metallic", e) : null;
    for (const o of ["light", "dark"]) {
      const a = new tt(`${t}_${o}`, this.scene);
      i.diffuseTexture && i.diffuseTexture[o] && (r.material.diffuseTexture = i.diffuseTexture[o], a.albedoTexture = await this.getTexture("diffuse", r)), s && (a.bumpTexture = s), n && (a.metallicTexture = n, a.useAmbientOcclusionFromMetallicTextureRed = !0, a.useRoughnessFromMetallicTextureAlpha = !1, a.useRoughnessFromMetallicTextureGreen = !0, a.useMetallnessFromMetallicTextureBlue = !0, a.metallic = 1, a.roughness = 1), a.environmentIntensity = i.environmentIntensity ?? 1, a.directIntensity = i.directIntensity ?? 1, a.allowShaderHotSwapping = !1, i.clearCoat && (a.clearCoat.isEnabled = !0, a.clearCoat.intensity = i.clearCoat.intensity ?? 1, a.clearCoat.roughness = i.clearCoat.roughness ?? 0), i.opacity !== void 0 && (a.alpha = i.opacity, a.backFaceCulling = !1, a.separateCullingPass = !0, a.twoSidedLighting = !0, a.Fragment_Custom_Alpha(`
#ifdef ALBEDO
alpha = mix(alpha, 1.0, albedoTexture.a);
#endif
`)), a.Vertex_Definitions(`
        attribute vec3 customColor;
        varying vec3 vDiceColor;
      `).Vertex_MainEnd(`
        vDiceColor = customColor;
      `).Fragment_Definitions(`
        varying vec3 vDiceColor;
      `).Fragment_Custom_Albedo(`
#ifdef ALBEDO
result = mix(toLinearSpace(vDiceColor), toLinearSpace(albedoTexture.rgb), albedoTexture.a) * albedoInfos.y;
#endif
`), a.AddAttribute("customColor");
    }
  }
  // this will create two materials - one with light text and one with dark text, the underlying color can be changed by color instance buffers
  async loadColorMaterial(e) {
    const { theme: t, material: i } = e;
    if (i.shading === "pbr")
      return this.loadPbrColorMaterial(e);
    const r = new qe(t + "_light", this.scene), s = mi(e);
    i.diffuseTexture && i.diffuseTexture.light && (s.material.diffuseTexture = e.material.diffuseTexture.light, r.diffuseTexture = await this.getTexture("diffuse", s)), i.bumpTexture && (r.bumpTexture = await this.getTexture("bump", e)), i.specularTexture && (r.specularTexture = await this.getTexture("specular", e)), r.allowShaderHotSwapping = !1, r.Vertex_Definitions(`
      attribute vec3 customColor;
      varying vec3 vColor;
    `).Vertex_MainEnd(`
      vColor = customColor;
    `).Fragment_Definitions(`
      varying vec3 vColor;
    `).Fragment_Custom_Diffuse(`
      baseColor.rgb = mix(vColor.rgb, baseColor.rgb, baseColor.a);
    `), r.AddAttribute("customColor");
    const n = r.clone(t + "_dark");
    i.diffuseTexture && i.diffuseTexture.dark && (s.material.diffuseTexture = e.material.diffuseTexture.dark, n.diffuseTexture = await this.getTexture("diffuse", s)), n.AddAttribute("customColor");
  }
  async getTexture(e, t) {
    const { basePath: i, material: r, theme: s } = t;
    let n;
    const o = e + "Level", a = e + "Texture";
    try {
      switch (e) {
        case "diffuse":
          n = await this.importTextureAsync(`${i}/${r[a]}`, s), r[o] && (n.level = r[o]);
          break;
        case "bump":
          n = await this.importTextureAsync(`${i}/${r[a]}`, s), r[o] && (n.level = r[o]);
          break;
        case "specular":
          n = await this.importTextureAsync(`${i}/${r[a]}`, s), r.specularPower && (n.specularPower = r.specularPower);
          break;
        case "metallic":
          n = await this.importTextureAsync(`${i}/${r[a]}`, s), n.gammaSpace = !1;
          break;
        default:
          throw new Error(`Texture type: ${e} is not supported`);
      }
    } catch (f) {
      console.error(f);
    }
    return n;
  }
  async importTextureAsync(e, t) {
    return new Promise((i, r) => {
      let s = e.match(/^(.*\/)(.*)$/), n = new I(
        e,
        // url: Nullable<string>
        this.scene,
        // sceneOrEngine: Nullable<Scene | ThinEngine>
        void 0,
        // noMipmapOrOptions?: boolean | ITextureCreationOptions
        !0,
        // invertY?: boolean
        void 0,
        // samplingMode?: number
        () => i(n),
        // onLoad?: Nullable<() => void>
        () => r(`Unable to load texture '${s[2]}' for theme: '${t}'. Check that your assetPath is configured correctly and that the files exist at path: '${s[1]}'`)
        // onError?: Nullable<(message?: string
      );
    }).catch((i) => console.error(i));
  }
  async load(e) {
    const { material: t } = e;
    t.type === "color" ? await this.loadColorMaterial(e) : t.type === "standard" ? await this.loadStandardMaterial(e) : console.error(`Material type: ${t.type} not supported`);
  }
}
var ie, dt, Pe, ht, Ne, Re, oe, ut, Oe, vt, It, Ce, Mt, Vt, Wi;
class sf {
  constructor(e) {
    // add a die to the scene
    Ee(this, Vt);
    We(this, "config");
    We(this, "initialized", !1);
    Ee(this, ie, {});
    Ee(this, dt, 0);
    Ee(this, Pe, 0);
    Ee(this, ht, []);
    Ee(this, Ne, void 0);
    Ee(this, Re, void 0);
    Ee(this, oe, void 0);
    Ee(this, ut, void 0);
    Ee(this, Oe, void 0);
    Ee(this, vt, void 0);
    Ee(this, It, void 0);
    Ee(this, Ce, void 0);
    Ee(this, Mt, {});
    We(this, "noop", () => {
    });
    We(this, "diceBufferView", new Float32Array(8e3));
    this.onInitComplete = e.onInitComplete || this.noop, this.onThemeLoaded = e.onThemeLoaded || this.noop, this.onRollResult = e.onRollResult || this.noop, this.onRollComplete = e.onRollComplete || this.noop, this.onDieRemoved = e.onDieRemoved || this.noop, this.initialized = this.initScene(e);
  }
  // initialize the babylon scene
  async initScene(e) {
    me(this, Ne, e.canvas), b(this, Ne).width = e.width, b(this, Ne).height = e.height, this.config = e.options, me(this, Re, fr(b(this, Ne))), me(this, oe, dr({ engine: b(this, Re) })), me(this, ut, hr({ engine: b(this, Re), scene: b(this, oe) })), me(this, Oe, Si({
      enableShadows: this.config.enableShadows,
      shadowTransparency: this.config.shadowTransparency,
      intensity: this.config.lightIntensity,
      scene: b(this, oe)
    })), me(this, vt, new Za({
      enableShadows: this.config.enableShadows,
      aspect: b(this, Ne).width / b(this, Ne).height,
      lights: b(this, Oe),
      scene: b(this, oe)
    })), me(this, It, new $l({ scene: b(this, oe) })), this.onInitComplete();
  }
  connect(e) {
    me(this, Ce, e), b(this, Ce).postMessage({
      action: "initBuffer",
      diceBuffer: this.diceBufferView.buffer
    }, [this.diceBufferView.buffer]), b(this, Ce).onmessage = (t) => {
      switch (t.data.action) {
        case "updates":
          this.updatesFromPhysics(t.data.diceBuffer);
          break;
        default:
          console.error("action from physicsWorker not found in offscreen worker");
          break;
      }
    };
  }
  updateConfig(e) {
    const t = this.config;
    this.config = e, t.enableShadows !== this.config.enableShadows && (Object.values(b(this, Oe)).forEach((i) => i.dispose()), me(this, Oe, Si(
      {
        enableShadows: this.config.enableShadows,
        shadowTransparency: this.config.shadowTransparency,
        intensity: this.config.lightIntensity,
        scene: b(this, oe)
      }
    ))), t.scale !== this.config.scale && Object.values(b(this, ie)).forEach(({ mesh: i }) => {
      var r;
      if (i) {
        const { x: s = 1, y: n = 1, z: o = 1 } = (r = i == null ? void 0 : i.metadata) == null ? void 0 : r.baseScale;
        i.scaling = new g(
          this.config.scale * s,
          this.config.scale * n,
          this.config.scale * o
        );
      }
    }), t.shadowTransparency !== this.config.shadowTransparency && (b(this, Oe).directional.shadowGenerator.darkness = this.config.shadowTransparency), t.lightIntensity !== this.config.lightIntensity && (b(this, Oe).directional.intensity = 0.65 * this.config.lightIntensity, b(this, Oe).hemispheric.intensity = 0.4 * this.config.lightIntensity);
  }
  // all this does is start the render engine.
  render(e) {
    b(this, Re).runRenderLoop(this.renderLoop.bind(this)), b(this, Ce).postMessage({
      action: "resumeSimulation",
      newStartPoint: e
    });
  }
  renderLoop() {
    b(this, Pe) && b(this, Pe) === Object.keys(b(this, ie)).length ? (b(this, Re).stopRenderLoop(), b(this, Ce).postMessage({
      action: "stopSimulation"
    }), this.onRollComplete()) : b(this, oe).render();
  }
  async loadTheme(e) {
    const { theme: t, basePath: i, material: r, meshFilePath: s, meshName: n } = e;
    if (await b(this, It).load({ theme: t, basePath: i, material: r }), !Object.keys(b(this, Mt)).includes(n)) {
      b(this, Mt)[n] = s;
      const o = await st.loadModels({ meshFilePath: s, meshName: n }, b(this, oe));
      if (!o)
        throw new Error("No colliders returned from the 3D mesh file. Low poly colliders are expected to be in the same file as the high poly dice and the mesh name contains the word 'collider'");
      b(this, Ce).postMessage({
        action: "loadModels",
        options: {
          colliders: o,
          meshName: n
        }
      });
    }
    this.onThemeLoaded({ id: t });
  }
  clear() {
    !Object.keys(b(this, ie)).length && !b(this, Pe) || (this.diceBufferView.byteLength && this.diceBufferView.fill(0), b(this, ht).forEach((e) => clearTimeout(e)), b(this, Re).stopRenderLoop(), Object.values(b(this, ie)).forEach((e) => {
      e.mesh && e.mesh.dispose();
    }), me(this, ie, {}), me(this, dt, 0), me(this, Pe, 0), b(this, oe).render());
  }
  add(e) {
    st.loadDie(e, b(this, oe)).then((t) => {
      b(this, ht).push(setTimeout(() => {
        Ei(this, Vt, Wi).call(this, t);
      }, it(this, dt)._++ * this.config.delay));
    });
  }
  addNonDie(e) {
    b(this, Re).activeRenderLoops.length === 0 && this.render(!1);
    const { id: t, value: i, ...r } = e, s = {
      id: t,
      value: i,
      config: r
    };
    b(this, ie)[t] = s, setTimeout(() => {
      b(this, ht).push(setTimeout(() => {
        this.handleAsleep(s);
      }, it(this, dt)._++ * this.config.delay));
    }, 10);
  }
  remove(e) {
    const t = b(this, ie)[e.id];
    t.hasOwnProperty("d10Instance") && (b(this, ie)[t.d10Instance.id].mesh && (b(this, ie)[t.d10Instance.id].mesh.dispose(), b(this, Ce).postMessage({
      action: "removeDie",
      id: t.d10Instance.id
    })), delete b(this, ie)[t.d10Instance.id], it(this, Pe)._--), b(this, ie)[e.id].mesh && b(this, ie)[e.id].mesh.dispose(), delete b(this, ie)[e.id], it(this, Pe)._--, b(this, oe).render(), this.onDieRemoved(e.rollId);
  }
  updatesFromPhysics(e) {
    this.diceBufferView = new Float32Array(e);
    let t = 1;
    for (let i = 0, r = this.diceBufferView[0]; i < r; i++) {
      if (!Object.keys(b(this, ie)).length)
        continue;
      const s = b(this, ie)[`${this.diceBufferView[t]}`];
      if (!s) {
        console.log("Error: die not available in scene to animate");
        break;
      }
      if (this.diceBufferView[t + 1] === -1)
        this.handleAsleep(s);
      else {
        const n = this.diceBufferView[t + 1], o = this.diceBufferView[t + 2], a = this.diceBufferView[t + 3], f = this.diceBufferView[t + 4], c = this.diceBufferView[t + 5], d = this.diceBufferView[t + 6], E = this.diceBufferView[t + 7];
        s.mesh.position.set(n, o, a), s.mesh.rotationQuaternion.set(f, c, d, E);
      }
      t = t + 8;
    }
    requestAnimationFrame(() => {
      b(this, Ce).postMessage({
        action: "stepSimulation",
        diceBuffer: this.diceBufferView.buffer
      }, [this.diceBufferView.buffer]);
    });
  }
  // handle the position updates from the physics worker. It's a simple flat array of numbers for quick and easy transfer
  async handleAsleep(e) {
    var t, i;
    if (e.asleep = !0, await st.getRollResult(e, b(this, oe)), e.d10Instance || e.dieParent) {
      if ((t = e == null ? void 0 : e.d10Instance) != null && t.asleep || (i = e == null ? void 0 : e.dieParent) != null && i.asleep) {
        const r = e.config.sides === 100 ? e : e.dieParent, s = e.config.sides === 10 ? e : e.d10Instance;
        r.rawValue && (r.value = r.rawValue), r.rawValue = r.value, r.value = r.value + s.value, this.onRollResult({
          rollId: r.config.rollId,
          value: r.value
        });
      }
    } else
      e.config.sides === 10 && e.value === 0 && (e.value = 10), this.onRollResult({
        rollId: e.config.rollId,
        value: e.value
      });
    it(this, Pe)._++;
  }
  // Grimoire Tales: the dice turned in place, once they have stopped, so a
  // player can look a die over. `x` and `y` are radians, as a drag across
  // the canvas reads: rightward turns the near face right, downward turns it
  // down. Each die is drawn towards the middle of the tray as it turns — a
  // d4 turns about its centre of mass, which is not the middle of what is
  // seen — and set back down on the floor it came to rest on.
  turn({ x: e = 0, y: t = 0 }) {
    if (b(this, Re).activeRenderLoops.length)
      return;
    const i = Xe.RotationAxis(b(this, ut).getDirection(g.Up()), -e).multiply(Xe.RotationAxis(b(this, ut).getDirection(g.Right()), -t));
    Object.values(b(this, ie)).forEach(({ mesh: r }) => {
      var a;
      if (!r)
        return;
      const s = () => {
        const f = r.getVerticesData(k.PositionKind), c = r.computeWorldMatrix(!0), d = new g(), E = new g(1 / 0, 1 / 0, 1 / 0), u = new g(-1 / 0, -1 / 0, -1 / 0);
        for (let _ = 0; _ < f.length; _ += 3)
          g.TransformCoordinatesFromFloatsToRef(f[_], f[_ + 1], f[_ + 2], c, d), E.minimizeInPlace(d), u.maximizeInPlace(d);
        return { low: E, high: u };
      };
      r.metadata ?? (r.metadata = {}), (a = r.metadata).restingOn ?? (a.restingOn = s().low.y), r.rotationQuaternion = i.multiply(r.rotationQuaternion);
      const { low: n, high: o } = s();
      r.position.x -= (n.x + o.x) / 2 * 0.5, r.position.z -= (n.z + o.z) / 2 * 0.5, r.position.y += r.metadata.restingOn - n.y;
    }), b(this, oe).render();
  }
  resize(e) {
    const t = b(this, Ne).width = e.width, i = b(this, Ne).height = e.height;
    b(this, vt).create({ aspect: t / i }), b(this, Re).resize();
  }
}
ie = new WeakMap(), dt = new WeakMap(), Pe = new WeakMap(), ht = new WeakMap(), Ne = new WeakMap(), Re = new WeakMap(), oe = new WeakMap(), ut = new WeakMap(), Oe = new WeakMap(), vt = new WeakMap(), It = new WeakMap(), Ce = new WeakMap(), Mt = new WeakMap(), Vt = new WeakSet(), Wi = async function(e) {
  b(this, Re).activeRenderLoops.length === 0 && this.render(e.newStartPoint);
  const t = {
    ...e,
    assetPath: this.config.assetPath,
    enableShadows: this.config.enableShadows,
    scale: this.config.scale,
    lights: b(this, Oe)
  }, i = new st(t, b(this, oe));
  return b(this, ie)[i.id] = i, b(this, Ce).postMessage({
    action: "addDie",
    options: {
      sides: e.sides,
      scale: this.config.scale,
      id: i.id,
      newStartPoint: e.newStartPoint,
      theme: e.theme,
      meshName: e.meshName
    }
  }), e.sides === 100 && e.data !== "single" && (i.d10Instance = await st.loadDie({ ...t, dieType: "d10", sides: 10, id: i.id + 1e4 }, b(this, oe)).then((r) => {
    const s = new st(r, b(this, oe));
    return s.dieParent = i, s;
  }), b(this, ie)[`${i.d10Instance.id}`] = i.d10Instance, b(this, Ce).postMessage({
    action: "addDie",
    options: {
      sides: 10,
      scale: this.config.scale,
      id: i.d10Instance.id,
      theme: e.theme,
      meshName: e.meshName
    }
  })), i;
};
export {
  sf as default
};
//# sourceMappingURL=world.onscreen.js.map
