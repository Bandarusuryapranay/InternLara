import axios from 'axios';

const API_BASE_URL = '/api';

class ApiService {
  // Agent endpoints
  async executeTask(task, mode = 'demo') {
    const response = await axios.post(`${API_BASE_URL}/agent/execute`, {
      task,
      mode
    });
    return response.data;
  }

  async approveSteps(steps, mode = 'demo', userInput = '') {
    const response = await axios.post(`${API_BASE_URL}/agent/approve`, {
      steps,
      mode,
      userInput
    });
    return response.data;
  }

  async handleRetryDecision(decision, step, context) {
    const response = await axios.post(`${API_BASE_URL}/agent/retry-decision`, {
      decision,
      step,
      context
    });
    return response.data;
  }

  async handlePopup(action, value = null) {
    const response = await axios.post(`${API_BASE_URL}/agent/handle-popup`, {
      action,
      value
    });
    return response.data;
  }

  async getStatus() {
    const response = await axios.get(`${API_BASE_URL}/agent/status`);
    return response.data;
  }

  async getPageInfo() {
    const response = await axios.get(`${API_BASE_URL}/agent/page-info`);
    return response.data;
  }

  async takeScreenshot() {
    const response = await axios.get(`${API_BASE_URL}/agent/screenshot`);
    return response.data;
  }

  async stopBrowser() {
    const response = await axios.post(`${API_BASE_URL}/agent/stop`);
    return response.data;
  }

  // File endpoints
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${API_BASE_URL}/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  async listFiles() {
    const response = await axios.get(`${API_BASE_URL}/files/list`);
    return response.data;
  }

  async deleteFile(filename) {
    const response = await axios.delete(`${API_BASE_URL}/files/${filename}`);
    return response.data;
  }

  // Ollama endpoints
  async checkOllamaHealth() {
    const response = await axios.get(`${API_BASE_URL}/ollama/health`);
    return response.data;
  }

  async analyzeAlert(alertText, alertType) {
    const response = await axios.post(`${API_BASE_URL}/ollama/analyze-alert`, {
      alertText,
      alertType
    });
    return response.data;
  }

  // History endpoints
  async getHistory(limit = 20) {
    const response = await axios.get(`${API_BASE_URL}/history?limit=${limit}`);
    return response.data;
  }

  async getHistoryTask(id) {
    const response = await axios.get(`${API_BASE_URL}/history/${id}`);
    return response.data;
  }

  async deleteHistoryTask(id) {
    const response = await axios.delete(`${API_BASE_URL}/history/${id}`);
    return response.data;
  }

  async clearHistory() {
    const response = await axios.delete(`${API_BASE_URL}/history`);
    return response.data;
  }
}

export default new ApiService();
