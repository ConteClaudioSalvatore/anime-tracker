// eslint-disable-next-line no-unused-vars
const debounceFunction = (f, time) => {
  let timeout = null;
  return (...args) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      f.apply(this, args);
    }, time);
  };
};
