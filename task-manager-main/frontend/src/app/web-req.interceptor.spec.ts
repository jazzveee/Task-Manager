import { TestBed } from '@angular/core/testing';

import { WebReqInterceptor } from './web-req.interceptor';

describe('WebReqInterceptor', () => {
  let service: WebReqInterceptor;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WebReqInterceptor);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
