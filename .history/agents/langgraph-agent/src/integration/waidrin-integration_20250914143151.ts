import { execa } from "execa";
import { readFile, writeFile, readdir, stat } from "fs-extra";
import { join, relative, resolve } from "path";
import { glob } from "fast-glob";
import type { AgentState, WaidrinContext } from "@/types";
import { WaidrinContextSchema } from "@/types";

export class WaidrinIntegration {
  private projectRoot: string;
  private waidrinRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.waidrinRoot = resolve(projectRoot, "..", "..");
  }

  /**
   * Get the current Waidrin context including game state and codebase files
   */
  async getWaidrinContext(): Promise<WaidrinContext> {
    const context: WaidrinContext = {
      gameState: {
        view: "unknown",
        world: undefined,
        locations: [],
        characters: [],
        events: [],
      },
      codebaseFiles: [],
      pluginSystem: {
        plugins: [],
        activePlugins: [],
      },
    };

    try {
      // Read game state from localStorage or state file
      const stateFile = join(this.waidrinRoot, "lib", "state.ts");
      if (await this.fileExists(stateFile)) {
        const stateContent = await readFile(stateFile, "utf-8");
        // Extract state structure (simplified)
        context.gameState.view = this.extractViewFromState(stateContent);
      }

      // Get all codebase files
      context.codebaseFiles = await this.getCodebaseFiles();

      // Get plugin information
      context.pluginSystem = await this.getPluginSystemInfo();

      return WaidrinContextSchema.parse(context);
    } catch (error) {
      console.error("Error getting Waidrin context:", error);
      return context;
    }
  }

  /**
   * Monitor file changes in the Waidrin codebase
   */
  async watchCodebaseChanges(callback: (changedFiles: string[]) => void): Promise<void> {
    const watchPatterns = [
      "lib/**/*.ts",
      "components/**/*.tsx",
      "views/**/*.tsx",
      "app/**/*.tsx",
      "plugins/**/*.js",
      "*.json",
      "*.md",
    ];

    for (const pattern of watchPatterns) {
      const files = await glob(pattern, { cwd: this.waidrinRoot });
      // Set up file watching here (would use chokidar in real implementation)
      console.log(`Watching ${files.length} files matching ${pattern}`);
    }
  }

  /**
   * Execute a command in the Waidrin project
   */
  async executeCommand(command: string, args: string[] = []): Promise<{ success: boolean; output: string; error?: string }> {
    try {
      const result = await execa(command, args, {
        cwd: this.waidrinRoot,
        stdio: "pipe",
      });

      return {
        success: true,
        output: result.stdout,
      };
    } catch (error) {
      return {
        success: false,
        output: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get git status of the Waidrin project
   */
  async getGitStatus(): Promise<string> {
    const result = await this.executeCommand("git", ["status", "--porcelain"]);
    return result.success ? result.output : "Git status unavailable";
  }

  /**
   * Get the last commit hash
   */
  async getLastCommit(): Promise<string> {
    const result = await this.executeCommand("git", ["rev-parse", "HEAD"]);
    return result.success ? result.output.trim() : "Unknown";
  }

  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all codebase files
   */
  private async getCodebaseFiles(): Promise<string[]> {
    const patterns = [
      "lib/**/*.ts",
      "components/**/*.tsx",
      "views/**/*.tsx",
      "app/**/*.tsx",
      "app/**/*.ts",
      "plugins/**/*.js",
      "*.json",
      "*.md",
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { cwd: this.waidrinRoot });
      files.push(...matches);
    }

    return files.map(file => relative(this.waidrinRoot, file));
  }

  /**
   * Get plugin system information
   */
  private async getPluginSystemInfo(): Promise<{ plugins: string[]; activePlugins: string[] }> {
    const pluginsDir = join(this.waidrinRoot, "plugins");
    const plugins: string[] = [];
    const activePlugins: string[] = [];

    try {
      if (await this.fileExists(pluginsDir)) {
        const pluginDirs = await readdir(pluginsDir);
        for (const dir of pluginDirs) {
          const manifestPath = join(pluginsDir, dir, "manifest.json");
          if (await this.fileExists(manifestPath)) {
            const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
            plugins.push(manifest.name || dir);
            if (manifest.enabled !== false) {
              activePlugins.push(manifest.name || dir);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error reading plugin system:", error);
    }

    return { plugins, activePlugins };
  }

  /**
   * Extract view from state file (simplified)
   */
  private extractViewFromState(content: string): string {
    const viewMatch = content.match(/view:\s*["'](\w+)["']/);
    return viewMatch ? viewMatch[1] : "unknown";
  }

  /**
   * Update agent state with Waidrin context
   */
  async updateAgentStateWithWaidrinContext(state: AgentState): Promise<Partial<AgentState>> {
    const waidrinContext = await this.getWaidrinContext();
    const gitStatus = await this.getGitStatus();
    const lastCommit = await this.getLastCommit();

    return {
      codebaseContext: {
        ...state.codebaseContext,
        currentFiles: waidrinContext.codebaseFiles,
        gitStatus,
        lastCommit,
      },
    };
  }

  /**
   * Run Waidrin development server
   */
  async startDevServer(): Promise<{ success: boolean; output: string; error?: string }> {
    return await this.executeCommand("npm", ["run", "dev"]);
  }

  /**
   * Build Waidrin project
   */
  async buildProject(): Promise<{ success: boolean; output: string; error?: string }> {
    return await this.executeCommand("npm", ["run", "build"]);
  }

  /**
   * Run tests
   */
  async runTests(): Promise<{ success: boolean; output: string; error?: string }> {
    return await this.executeCommand("npm", ["run", "test"]);
  }

  /**
   * Run linting
   */
  async runLinting(): Promise<{ success: boolean; output: string; error?: string }> {
    return await this.executeCommand("npm", ["run", "lint"]);
  }

  /**
   * Install dependencies
   */
  async installDependencies(): Promise<{ success: boolean; output: string; error?: string }> {
    return await this.executeCommand("npm", ["install"]);
  }

  /**
   * Get package.json information
   */
  async getPackageInfo(): Promise<{ name: string; version: string; scripts: Record<string, string> }> {
    try {
      const packagePath = join(this.waidrinRoot, "package.json");
      const packageContent = await readFile(packagePath, "utf-8");
      const packageJson = JSON.parse(packageContent);
      
      return {
        name: packageJson.name || "unknown",
        version: packageJson.version || "0.0.0",
        scripts: packageJson.scripts || {},
      };
    } catch (error) {
      return {
        name: "unknown",
        version: "0.0.0",
        scripts: {},
      };
    }
  }

  /**
   * Check if the project is in a clean git state
   */
  async isCleanGitState(): Promise<boolean> {
    const status = await this.getGitStatus();
    return status.trim() === "";
  }

  /**
   * Get modified files from git
   */
  async getModifiedFiles(): Promise<string[]> {
    const status = await this.getGitStatus();
    return status
      .split("\n")
      .filter(line => line.trim())
      .map(line => line.substring(3)) // Remove git status prefix
      .filter(file => file.trim());
  }
}
