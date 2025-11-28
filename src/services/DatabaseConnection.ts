// Patrón Singleton: Conexión a base de datos
class DatabaseConnection {
  private static instance: DatabaseConnection;
  private baseUrl: string = 'http://localhost:3000';

  private constructor() {
    console.log('🔌 Conexión a base de datos inicializada (Singleton)');
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    if (!response.ok) throw new Error('Error al obtener datos');
    return response.json();
  }

  public async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error al enviar datos');
    return response.json();
  }

  public async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error al actualizar datos');
    return response.json();
  }

  public async delete(endpoint: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Error al eliminar datos');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }
}

export default DatabaseConnection;
