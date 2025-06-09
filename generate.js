const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');

async function generateSite() {
  try {
    const publicDir = path.join(__dirname, 'public');
    const dataDir = path.join(__dirname, 'data');
    const recipesDir = path.join(dataDir, 'recipes');
    const templatesDir = path.join(__dirname, 'templates');
    const rootDir = __dirname; // Project root

    // Ensure public directory is clean or exists
    await fs.emptyDir(publicDir);

    // Read and compile templates
    const layoutSource = await fs.readFile(path.join(templatesDir, 'layout.hbs'), 'utf8');
    const recipeSource = await fs.readFile(path.join(templatesDir, 'recipe.hbs'), 'utf8');
    const indexSource = await fs.readFile(path.join(templatesDir, 'index.hbs'), 'utf8');

    const layoutTemplate = Handlebars.compile(layoutSource);
    const recipeTemplate = Handlebars.compile(recipeSource);
    const indexTemplate = Handlebars.compile(indexSource);

    // Register recipe.hbs as a partial that can be used within layout.hbs if needed,
    // or more simply, render recipe.hbs content and pass it as 'body' to layout.hbs
    // For this setup, we'll render recipe/index first, then pass to layout.

    // Read all recipe data
    const recipeFiles = await fs.readdir(recipesDir);
    const allRecipesData = [];
    for (const recipeFile of recipeFiles) {
      if (recipeFile.endsWith('.jsonld')) {
        const filePath = path.join(recipesDir, recipeFile);
        const content = await fs.readJson(filePath);
        allRecipesData.push(content);
      }
    }

    // Sort recipes by headline for consistent navigation order
    allRecipesData.sort((a, b) => a.headline.localeCompare(b.headline));

    // Generate recipe pages
    for (const recipeData of allRecipesData) {
      const recipeContent = recipeTemplate(recipeData);
      const pageHtml = layoutTemplate({
        ...recipeData, // includes pageTitle, featuredImage, headline etc. from the recipe's JSON
        body: recipeContent,
        recipes: allRecipesData // for navigation
      });
      await fs.writeFile(path.join(publicDir, `${recipeData.slug}.html`), pageHtml);
      console.log(`Generated: ${recipeData.slug}.html`);
    }

    // Generate index page
    // Potentially load specific data for index page if it exists e.g. data/index.json
    // For now, index.hbs is static content, but it still needs the recipe list for nav
    const indexContent = indexTemplate({}); // No specific data for index.hbs itself yet
    const indexHtml = layoutTemplate({
      pageTitle: "The Bread Poets' Society: recipes in verse", // Specific title for index
      body: indexContent,
      recipes: allRecipesData, // for navigation
      // featuredImage for index page can be the default bread1.gif, handled by layout logic
    });
    await fs.writeFile(path.join(publicDir, 'index.html'), indexHtml);
    console.log('Generated: index.html');

    // Copy static assets
    const assetsToCopy = [
      'bps.css',
      'CNAME',
      'robots.txt',
      'favicon.ico',
      'bread1.gif', // Default featured image, might be referenced by layout
      'img_4638_small.jpg', // crispy-pork image
      'lemony_chickpea.jpg', // Will be needed later
      'pancakes-small.jpg',  // Will be needed later
      'smack-pie.jpg',       // Will be needed later
      'why.html',            // Static page
      'colorgame.html'       // Static page
    ];

    const imagesDir = path.join(rootDir, 'images');
    const publicImagesDir = path.join(publicDir, 'images');
    await fs.ensureDir(publicImagesDir); // Create images dir in public

    for (const asset of assetsToCopy) {
      const sourcePath = path.join(rootDir, asset);
      const destPath = path.join(publicDir, asset);
      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, destPath);
        console.log(`Copied: ${asset}`);
      } else {
        console.warn(`Asset not found, skipped: ${asset}`);
      }
    }

    // Copy entire images folder contents
    if (await fs.pathExists(imagesDir)) {
        const imageFiles = await fs.readdir(imagesDir);
        for (const imgFile of imageFiles) {
            await fs.copy(path.join(imagesDir, imgFile), path.join(publicImagesDir, imgFile));
            console.log(`Copied image: images/${imgFile}`);
        }
    } else {
        console.warn('Root images directory not found, skipped copying images from there.');
    }


    console.log('Static site generation complete!');

  } catch (error) {
    console.error('Error during site generation:', error);
    process.exit(1); // Exit with error code
  }
}

generateSite();
