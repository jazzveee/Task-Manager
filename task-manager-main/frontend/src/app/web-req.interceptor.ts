import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WebReqInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) { }


  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // handle the request
      req = this.addAuthHeader(req);

      //call next() and handle the response
      return next.handle(req).pipe(
        catchError((err: HttpErrorResponse) => {
          return throwError(()=>err);
        })
      )
  }

  addAuthHeader(request: HttpRequest<any>) {
    // get the access token
    const token = this.authService.getAccessToken();

    if(token) {
      // append the access token to the request header
      return request.clone({
        setHeaders: {
          'x-access-token': token
        }
      })
    }
    return request;
  }
}
