"use client";

import axios from "axios";
import { FileItem } from "@/contexts/FileContext";

const API_BASE_URL = "/api";

export async function listDirectory(path: string): Promise<FileItem[]> {
  try {
    const response = await axios.get(`${API_BASE_URL}/files`, {
      params: { path }
    });
    return response.data;
  } catch (error) {
    console.error("Error listing directory:", error);
    throw error;
  }
}

export async function getFileContent(path: string): Promise<Blob> {
  try {
    const response = await axios.get(`${API_BASE_URL}/files/content`, {
      params: { path },
      responseType: "blob"
    });
    return response.data;
  } catch (error) {
    console.error("Error getting file content:", error);
    throw error;
  }
}

export async function createDirectory(path: string, name: string): Promise<void> {
  try {
    await axios.post(`${API_BASE_URL}/files/directory`, { path, name });
  } catch (error) {
    console.error("Error creating directory:", error);
    throw error;
  }
}

export async function uploadFile(path: string, file: File): Promise<void> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);

    await axios.post(`${API_BASE_URL}/files/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

export async function deleteFileOrDirectory(path: string): Promise<void> {
  try {
    await axios.delete(`${API_BASE_URL}/files`, {
      params: { path }
    });
  } catch (error) {
    console.error("Error deleting file/directory:", error);
    throw error;
  }
}

export async function renameFileOrDirectory(path: string, newName: string): Promise<void> {
  try {
    await axios.put(`${API_BASE_URL}/files/rename`, { path, newName });
  } catch (error) {
    console.error("Error renaming file/directory:", error);
    throw error;
  }
} 