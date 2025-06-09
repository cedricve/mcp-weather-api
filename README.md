# Node.js Development Container

This project is a Node.js application configured to run in a development container. Below are the details on how to set up and use the project.

## Prerequisites

- Docker installed on your machine.
- Visual Studio Code with the Remote - Containers extension.

## Getting Started

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd nodejs-devcontainer
   ```

2. **Open the project in Visual Studio Code**:
   Launch Visual Studio Code and open the project folder.

3. **Reopen in Container**:
   Press `F1`, then select `Remote-Containers: Reopen in Container`. This will build the Docker image defined in the `.devcontainer/Dockerfile` and set up the development environment.

## Project Structure

- **.devcontainer/**: Contains the configuration files for the development container.
  - **devcontainer.json**: Configuration for the development container.
  - **Dockerfile**: Defines the Docker image for the development container.
  
- **src/**: Contains the source code for the application.
  - **index.js**: The entry point of the Node.js application.

- **package.json**: Configuration file for npm, listing dependencies and scripts.

## Usage

After the container is built and running, you can start developing your Node.js application. Use the integrated terminal in Visual Studio Code to run npm scripts or start the application.

## Contributing

Feel free to submit issues or pull requests if you have suggestions or improvements for the project.

## License

This project is licensed under the MIT License. See the LICENSE file for details.