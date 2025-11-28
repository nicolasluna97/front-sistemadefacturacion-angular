import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';          // 👈 IMPORT NECESARIO
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    // RouterLink ya no es necesario porque no lo usamos en el HTML
  ],
  templateUrl: './verify-email-page.component.html',
  styleUrl: './verify-email-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerifyEmailPageComponent {

  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);

  loading = false;
  resendLoading = false;
  serverError: string | null = null;
  successMsg: string | null = null;

  email: string = '';

  form = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  constructor() {
    const emailParam = this.route.snapshot.queryParamMap.get('email');
    if (!emailParam) {
      this.serverError = 'No se recibió el email.';
    } else {
      this.email = emailParam;
    }
  }

  submit() {
    this.serverError = null;
    this.successMsg = null;

    if (!this.email || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const code = this.form.value.code!;

    this.auth.verifyEmail(this.email, code)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: ok => {
          if (ok) {
            this.successMsg = '¡Email verificado correctamente! Redirigiendo...';
            this.cdr.markForCheck();

            setTimeout(() => {
              this.router.navigateByUrl('/');
            }, 1200);
          } else {
            this.serverError = 'Código incorrecto o expirado.';
            this.cdr.markForCheck();
          }
        },
        error: err => {
          const msg = err?.error?.message || 'Código incorrecto.';
          this.serverError = msg;
          this.cdr.markForCheck();
        }
      });
  }

  resend() {
    if (!this.email) return;

    this.resendLoading = true;
    this.serverError = null;
    this.successMsg = null;

    this.auth.resendVerificationCode(this.email).subscribe({
      next: ok => {
        this.resendLoading = false;
        if (ok) {
          this.successMsg = 'Se envió un nuevo código a tu email.';
        } else {
          this.serverError = 'No se pudo reenviar el código.';
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.resendLoading = false;
        this.serverError = 'No se pudo reenviar el código.';
        this.cdr.markForCheck();
      }
    });
  }
}
