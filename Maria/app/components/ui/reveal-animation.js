export function playReveal(node, name, open) {
  const animation = node
    .getAnimations()
    .find((entry) => entry.animationName === name);
  return animation ? playAnimation(animation, open) : null;
}

export function playAnimation(animation, open) {
  if (!open && !animation.currentTime) {
    animation.pause();
    animation.currentTime = 0;
    return null;
  }

  const rate = open ? 1 : -1;
  if (
    animation.playbackRate === rate &&
    (animation.playState === "running" || animation.playState === "finished")
  ) {
    return animation.finished;
  }

  animation.updatePlaybackRate(rate);
  animation.play();
  return animation.finished;
}
