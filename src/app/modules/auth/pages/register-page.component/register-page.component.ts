import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
  FormGroup
} from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLinkActive, RouterLink, HttpClientModule],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPageComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  showPass = false;
  showPass2 = false;
  loading = false;
  serverError: string | null = null;

  form!: FormGroup<{
    fullName: any;
    email: any;
    password: any;
    confirmPassword: any;
    terms: any;
  }>;

  constructor() {
    this.form = this.fb.group(
      {
        fullName: this.fb.control('', {
          validators: [Validators.required, Validators.minLength(3), Validators.maxLength(60)],
          nonNullable: true,
        }),
        email: this.fb.control('', {
          validators: [Validators.required, Validators.email],
          nonNullable: true,
        }),
        password: this.fb.control('', {
          validators: [Validators.required, Validators.minLength(8), passwordComplexityValidator],
          nonNullable: true,
        }),
        confirmPassword: this.fb.control('', {
          validators: [Validators.required],
          nonNullable: true,
        }),
        terms: this.fb.control(false, {
          validators: [Validators.requiredTrue],
          nonNullable: true,
        }),
      },
      { validators: [passwordsMatchValidator] }
    );
  }

  // ===== Getters de comodidad =====
  get fullName() { return this.form.controls['fullName'] as AbstractControl; }
  get email() { return this.form.controls['email'] as AbstractControl; }
  get password() { return this.form.controls['password'] as AbstractControl; }
  get confirmPassword() { return this.form.controls['confirmPassword'] as AbstractControl; }
  get terms() { return this.form.controls['terms'] as AbstractControl; }

  // Checklist en vivo para la contraseña
  get passChecks() {
    const v: string = (this.password.value as string) || '';
    return {
      len: v.length >= 8,
      upper: /[A-Z]/.test(v),
      lower: /[a-z]/.test(v),
      num: /[0-9]/.test(v),
    };
  }

  toggleShowPass() { this.showPass = !this.showPass; this.cdr.markForCheck(); }
  toggleShowPass2() { this.showPass2 = !this.showPass2; this.cdr.markForCheck(); }

  submit() {
    this.serverError = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const { fullName, email, password } = this.form.getRawValue() as {
      fullName: string;
      email: string;
      password: string;
      confirmPassword: string;
      terms: boolean;
    };

    this.auth.register({ fullName, email, password })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (ok: boolean) => {
          if (ok) {
            // 🔴 ANTES: this.router.navigateByUrl('/');
            // ✅ AHORA: vamos a la pantalla de verificar email, pasando el email
            this.router.navigate(['/auth/verify-email'], {
              queryParams: { email },
            });
          } else {
            this.serverError = 'No se pudo registrar. Verificá los datos.';
          }
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          const msg = err?.error?.message || err?.message || 'Ocurrió un error inesperado.';
          this.serverError = Array.isArray(msg) ? msg.join(' ') : String(msg);
          this.cdr.markForCheck();
        }
      });
  }
}

/* ====== Validadores puros (fuera de la clase) ====== */
function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pass = group.get('password')?.value ?? '';
  const confirm = group.get('confirmPassword')?.value ?? '';
  return pass && confirm && pass !== confirm ? { passwordsMismatch: true } : null;
}

function passwordComplexityValidator(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value || '';
  const hasUpper = /[A-Z]/.test(v);
  const hasLower = /[a-z]/.test(v);
  const hasNumber = /[0-9]/.test(v);

  return (hasUpper && hasLower && hasNumber) ? null : { weakPassword: true };
}
