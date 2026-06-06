/* LabRep State — estado global mínimo (plano, rep_id, user) */

let _state = {
  user: null,        // dados do /api/v1/auth/me
  plano: 'free',
  repId: null,
};

export function getState() {
  return { ..._state };
}

export function setState(partial) {
  _state = { ..._state, ...partial };
}

export function getPlan() {
  return _state.plano ?? 'free';
}

export function isPro() {
  return ['pro', 'pro_plus', 'b2b'].includes(_state.plano);
}

export function isProPlus() {
  return ['pro_plus', 'b2b'].includes(_state.plano);
}
