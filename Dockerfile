# Start from node image (contains already nodejs + npm)
FROM node:10-alpine

# Create and setup our work directory + users right
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app

# Copy the package json files to the image
COPY package*.json ./

# Set the user for the image
USER node

# Launch the install of all needed packages in the package.json
RUN npm install

# Copy the rest of the app being sure the owner is node & not root
COPY --chown=node:node . .

# Expose the port 3000 on which our application is running
EXPOSE 3000

# Start the app OR we can use the npm start if it has been specified in the package.json
CMD [ "node", "app.js" ]