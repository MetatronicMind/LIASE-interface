const hasValidProperty = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
  && obj[prop] !== undefined
  && obj[prop] !== null
  && obj[prop] !== '';

export default hasValidProperty;
