const registeredPartials = new Set();
const partialsToRegister = new Map<string, string>();
const isGameLoaded = false;
export const registerPartial = async (filePath: string, partialName: string) => {
  if (!game.socket) {
    partialsToRegister.set(partialName, filePath);
    console.log(`Partial awaiting registration: ${partialName}`);
  }
  else {
    foundry.applications.handlebars.loadTemplates({ [partialName]: filePath });
    console.log(`Partial registered successfully: ${partialName}`);
    registeredPartials.add(partialName);
  }
  // if (registeredPartials.has(partialName)) {
  //   return;
  // }

  // try {
  //   const response = await fetch(filePath); // Fetch the template file
  //   const templateContent = await response.text(); // Read response as text
  //   Handlebars.registerPartial(partialName, templateContent); // Register the partial
  //   console.log(`Partial registered successfully: ${partialName}`);
  //   registeredPartials.add(partialName);
  // } catch (error) {
  //   console.error(`Error loading partial ${partialName}:`, error);
  // }
};

export const runPartialRegistration = () => {
  for (const [partialName, filePath] of partialsToRegister.entries()) {
    foundry.applications.handlebars.loadTemplates({ [partialName]: filePath });
    console.log(`Partial registered successfully: ${partialName}`);
    registeredPartials.add(partialName);
  }
};
