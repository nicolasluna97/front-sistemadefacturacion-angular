// verify-email-page.component.ts

// ...imports...
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './verify-email-page.component.html',
  styleUrl: './verify-email-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerifyEmailPageComponent implements OnDestroy {

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

  // segundos de cooldown para el botón de reenvío
  resendCooldown = 0;
  private resendTimerId: any = null;

  form = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

 constructor() {
  const emailParam = this.route.snapshot.queryParamMap.get('email');

  if (!emailParam) {
    this.serverError = 'No se recibió el email.';
  } else {
    this.email = emailParam;

    // 🔹 APENAS LLEGAMOS A ESTA PANTALLA, ARRANCAMOS EL COOLDOWN
    this.startCooldown(30);
    }
  }


  ngOnDestroy(): void {
    if (this.resendTimerId) {
      clearInterval(this.resendTimerId);
    }
  }

  private startCooldown(seconds: number) {
    this.resendCooldown = seconds;
    if (this.resendTimerId) {
      clearInterval(this.resendTimerId);
    }
    this.resendTimerId = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        this.resendCooldown = 0;
        clearInterval(this.resendTimerId);
        this.resendTimerId = null;
      }
      this.cdr.markForCheck();
    }, 1000);
  }

  // 🔹 NUEVO: etiqueta formateada mm:ss para mostrar en la UI
  get resendCooldownLabel(): string {
    if (this.resendCooldown <= 0) return '';
    const minutes = Math.floor(this.resendCooldown / 60);
    const seconds = this.resendCooldown % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
    if (!this.email || this.resendCooldown > 0) return;

    this.resendLoading = true;
    this.serverError = null;
    this.successMsg = null;

    this.auth.resendVerificationCode(this.email).subscribe({
      next: ok => {
        this.resendLoading = false;

        if (ok) {
          this.successMsg = 'Se envió un nuevo código a tu email.';
          // arrancamos el cooldown de 30s
          this.startCooldown(30);
        } else {
          this.serverError = 'No se pudo reenviar el código.';
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.resendLoading = false;

        const msg = err?.error?.message || 'No se pudo reenviar el código.';
        this.serverError = msg;

        this.cdr.markForCheck();
      }
    });
  }
}
