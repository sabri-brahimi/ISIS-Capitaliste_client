import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders  } from '@angular/common/http';
import { World, Pallier, Product } from './world';

@Injectable({
  providedIn: 'root'
})
export class RestserviceService {

  server = "http://localhost:8080/adventureisis/api/";
  serverImg = "http://localhost:8080/icons/";
  user = "";

  constructor(private http: HttpClient) { }

  getUser(): string{
    return this.user;
  };

  setUser(user: string): void{
    this.user = user;
  };

  getServer(): string{
    return this.server;
  }

  getServerImage(): string{
    return this.serverImg;
  }

  private handleError(error: any): Promise<any> { 
    console.error('An error occurred', error); 
    return Promise.reject(error.message || error); 
  }; 
  
  getWorld(): Promise<World> {
    return this.http.get(this.server + "world", {
    headers: this.setHeaders(this.user)})
    .toPromise().catch(this.handleError);
  }
   
  putProduct(product: Product): Promise<Boolean> {
    return this.http.put(this.server + "product", product).toPromise().catch(this.handleError);
  }

  putManager(manager: Pallier): Promise<Response> {
    return this.http
      .put(this.server + 'manager', manager, {
        headers: this.setHeaders(this.user),
      })
      .toPromise().
      catch(this.handleError);
  }

  putUpgrade(upgrade: Pallier): Promise<Response> {
    return this.http
      .put(this.server + 'upgrade', upgrade, {
        headers: this.setHeaders(this.user),
      })
      .toPromise()
      .catch(this.handleError);
  }

  private setHeaders(user: string): HttpHeaders {
    return new HttpHeaders({ 'X-User': user });
  }
  
}
