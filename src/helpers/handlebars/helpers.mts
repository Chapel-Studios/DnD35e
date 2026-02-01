export const registerHandlebarsHelpers = () => {
  Handlebars.registerHelper('or', (...args) => {
    // Last arg is the Handlebars options object
    args.pop();
    return args.find(Boolean);
  });
  Handlebars.registerHelper('ternary', (cond, a, b) => cond ? a : b);
  Handlebars.registerHelper('not', (bool) => !bool);
};
