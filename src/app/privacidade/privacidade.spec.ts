import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Privacidade } from './privacidade';

describe('Privacidade', () => {
  let component: Privacidade;
  let fixture: ComponentFixture<Privacidade>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Privacidade]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Privacidade);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
