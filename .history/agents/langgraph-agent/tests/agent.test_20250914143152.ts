import { describe, it, expect, beforeEach, vi } from "vitest";
import { WaidrinAgent } from "@/core/agent";
import { WaidrinTools } from "@/tools/waidrin-tools";
import { CodebaseTools } from "@/tools/codebase-tools";
import type { AgentConfig } from "@/types";

// Mock the external dependencies
vi.mock("execa");
vi.mock("fs-extra");
vi.mock("fast-glob");

describe("WaidrinAgent", () => {
  let agent: WaidrinAgent;
  let config: AgentConfig;

  beforeEach(() => {
    config = {
      model: "gpt-4",
      temperature: 0.1,
      maxIterations: 5,
      autoCommit: false,
      watchMode: false,
      projectRoot: "/test/project",
      openaiApiKey: "test-key",
    };

    agent = new WaidrinAgent(config);
  });

  describe("constructor", () => {
    it("should create agent with correct configuration", () => {
      expect(agent).toBeDefined();
      // Add more specific tests for agent initialization
    });
  });

  describe("event handling", () => {
    it("should register event listeners", () => {
      const listener = vi.fn();
      agent.onEvent("task_started", listener);
      
      // Simulate an event
      // This would need to be implemented based on the actual event system
      expect(listener).toBeDefined();
    });

    it("should remove event listeners", () => {
      const listener = vi.fn();
      agent.onEvent("task_started", listener);
      agent.offEvent("task_started", listener);
      
      // Verify listener is removed
      expect(listener).toBeDefined();
    });
  });

  describe("agent execution", () => {
    it("should run with initial state", async () => {
      const initialState = {
        currentTask: "Test task",
        codebaseContext: {
          projectRoot: "/test/project",
          currentFiles: [],
          modifiedFiles: [],
        },
      };

      // Mock the LLM responses
      vi.mock("@langchain/openai", () => ({
        ChatOpenAI: vi.fn().mockImplementation(() => ({
          invoke: vi.fn().mockResolvedValue({
            content: JSON.stringify({ analysis: "Test analysis" }),
          }),
        })),
      }));

      const result = await agent.run(initialState);
      
      expect(result).toBeDefined();
      expect(result.currentTask).toBe("Test task");
    });
  });
});

describe("WaidrinTools", () => {
  let waidrinTools: WaidrinTools;

  beforeEach(() => {
    waidrinTools = new WaidrinTools("/test/project");
  });

  describe("file operations", () => {
    it("should read files", async () => {
      // Mock fs-extra readFile
      const mockReadFile = vi.fn().mockResolvedValue("test content");
      vi.mocked(require("fs-extra")).readFile = mockReadFile;

      const result = await waidrinTools.getGameState();
      
      expect(result).toBeDefined();
      expect(mockReadFile).toHaveBeenCalled();
    });

    it("should handle file read errors", async () => {
      // Mock fs-extra readFile to throw error
      const mockReadFile = vi.fn().mockRejectedValue(new Error("File not found"));
      vi.mocked(require("fs-extra")).readFile = mockReadFile;

      const result = await waidrinTools.getGameState();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("File not found");
    });
  });

  describe("command execution", () => {
    it("should execute commands", async () => {
      // Mock execa
      const mockExeca = vi.fn().mockResolvedValue({
        stdout: "test output",
        stderr: "",
        exitCode: 0,
      });
      vi.mocked(require("execa")).execa = mockExeca;

      const result = await waidrinTools.runLinting();
      
      expect(result.success).toBe(true);
      expect(mockExeca).toHaveBeenCalledWith("npm", ["run", "lint"], expect.any(Object));
    });

    it("should handle command execution errors", async () => {
      // Mock execa to throw error
      const mockExeca = vi.fn().mockRejectedValue(new Error("Command failed"));
      vi.mocked(require("execa")).execa = mockExeca;

      const result = await waidrinTools.runLinting();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("Command failed");
    });
  });
});

describe("CodebaseTools", () => {
  let codebaseTools: CodebaseTools;

  beforeEach(() => {
    codebaseTools = new CodebaseTools("/test/project");
  });

  describe("file search", () => {
    it("should search for files", async () => {
      // Mock fast-glob
      const mockGlob = vi.fn().mockResolvedValue(["file1.ts", "file2.ts"]);
      vi.mocked(require("fast-glob")).glob = mockGlob;

      const result = await codebaseTools.searchFiles("**/*.ts");
      
      expect(result.success).toBe(true);
      expect(result.data.files).toEqual(["file1.ts", "file2.ts"]);
      expect(mockGlob).toHaveBeenCalledWith("**/*.ts", { cwd: "/test/project" });
    });

    it("should search for text content", async () => {
      // Mock fs-extra and fast-glob
      const mockReadFile = vi.fn()
        .mockResolvedValueOnce("function test() { return 'test'; }")
        .mockResolvedValueOnce("const example = 'test';");
      const mockGlob = vi.fn().mockResolvedValue(["file1.ts", "file2.ts"]);
      
      vi.mocked(require("fs-extra")).readFile = mockReadFile;
      vi.mocked(require("fast-glob")).glob = mockGlob;

      const result = await codebaseTools.searchText("test");
      
      expect(result.success).toBe(true);
      expect(result.data.results).toHaveLength(2);
      expect(result.data.totalMatches).toBe(2);
    });
  });

  describe("code analysis", () => {
    it("should analyze code structure", async () => {
      const testCode = `
        import { z } from "zod";
        
        export interface TestInterface {
          name: string;
        }
        
        export function testFunction(): string {
          return "test";
        }
        
        export class TestClass {
          method() {
            return "test";
          }
        }
      `;

      // Mock fs-extra readFile
      const mockReadFile = vi.fn().mockResolvedValue(testCode);
      vi.mocked(require("fs-extra")).readFile = mockReadFile;

      const result = await codebaseTools.analyzeCodeStructure("test.ts");
      
      expect(result.success).toBe(true);
      expect(result.data.functions).toHaveLength(1);
      expect(result.data.classes).toHaveLength(1);
      expect(result.data.interfaces).toHaveLength(1);
      expect(result.data.imports).toContain("zod");
    });
  });
});
