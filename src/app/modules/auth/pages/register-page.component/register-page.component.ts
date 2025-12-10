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
          validators: [
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(20)
          ],
          nonNullable: true,
        }),

        email: this.fb.control('', {
          validators: [
            Validators.required,
            Validators.email,
            Validators.maxLength(100)
          ],
          nonNullable: true,
        }),

        password: this.fb.control('', {
          validators: [
            Validators.required,
            Validators.minLength(6),
            Validators.maxLength(50),
            passwordComplexityValidator
          ],
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

  // ====== GETTERS ======
  get fullName() { return this.form.controls['fullName']; }
  get email() { return this.form.controls['email']; }
  get password() { return this.form.controls['password']; }
  get confirmPassword() { return this.form.controls['confirmPassword']; }
  get terms() { return this.form.controls['terms']; }

  // Checklist actualizado (coincide con el backend)
  get passChecks() {
    const v: string = this.password.value || '';
    return {
      len: v.length >= 6,
      upper: /[A-Z]/.test(v),
      lower: /[a-z]/.test(v),
      numOrSymbol: /(\d|\W)/.test(v)
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
      next: () => {
        this.router.navigate(['/auth/verify-email'], {
          queryParams: { email },
        });
      },
      error: (err: any) => {
        const msg = err?.error?.message || err?.message || 'Ocurrió un error inesperado.';
        this.serverError = Array.isArray(msg) ? msg.join(' ') : String(msg);
        this.cdr.markForCheck();
      }
    });
  }
}
/* ====== VALIDADORES ====== */

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pass = group.get('password')?.value ?? '';
  const confirm = group.get('confirmPassword')?.value ?? '';
  return pass && confirm && pass !== confirm ? { passwordsMismatch: true } : null;
}

function passwordComplexityValidator(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value || '';

  const hasUpper = /[A-Z]/.test(v);
  const hasLower = /[a-z]/.test(v);
  const hasNumOrSymbol = /(\d|\W)/.test(v);

  return (hasUpper && hasLower && hasNumOrSymbol)
    ? null
    : { weakPassword: true };
}
