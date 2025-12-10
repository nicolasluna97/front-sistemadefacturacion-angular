import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Subscription, finalize } from 'rxjs';

import { Navbar } from '../../../core/navbar/navbar';
import { Sidenav } from '../../../core/sidenav/sidenav';
import {
  AccountService,
  AccountMe,
} from '../services/account.service';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Navbar, Sidenav],
  templateUrl: './account-page.html',
  styleUrls: ['./account-page.css'],
})
export class AccountPage implements OnInit, OnDestroy {

  private fb = inject(FormBuilder);
  private accountSvc = inject(AccountService);

  // ===== estado general =====
  loading = false;
  loadError: string | null = null;
  me: AccountMe | null = null;

  // ===== nombre de usuario =====
  profileForm!: FormGroup;
  profileSaving = false;
  profileError: string | null = null;
  profileSuccess: string | null = null;
  editingName = false;

  // ===== email =====
  showEmailModal = false;
  emailStep: 'edit' | 'verify' = 'edit';
  emailForm!: FormGroup;
  emailCodeForm!: FormGroup;
  emailError: string | null = null;
  emailSuccess: string | null = null;
  emailLoading = false;

  resendSeconds = 0;
  private resendTimer: any = null;

  // ===== password =====
  showPasswordModal = false;
  passwordForm!: FormGroup;
  passwordError: string | null = null;
  passwordSuccess: string | null = null;
  passwordLoading = false;

  private sub = new Subscription();

  // ===== getters para los formularios =====

  // nombre
  get fullNameCtrl(): AbstractControl {
    return this.profileForm.get('fullName')!;
  }

  // email
  get newEmail(): AbstractControl {
    return this.emailForm.get('newEmail')!;
  }

  get emailCode(): AbstractControl {
    return this.emailCodeForm.get('code')!;
  }

  // password
  get currentPassword(): AbstractControl {
    return this.passwordForm.get('currentPassword')!;
  }

  get newPassword(): AbstractControl {
    return this.passwordForm.get('newPassword')!;
  }

  get confirmNewPassword(): AbstractControl {
    return this.passwordForm.get('confirmNewPassword')!;
  }

  // checklist como en el register
  get passChecks() {
    const v: string = (this.newPassword.value as string) || '';
    return {
      len: v.length >= 6,
      upper: /[A-Z]/.test(v),
      lower: /[a-z]/.test(v),
      numOrSymbol: /(\d|\W)/.test(v),
    };
  }

  ngOnInit(): void {
    this.buildForms();
    this.loadMe();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.resendTimer) clearInterval(this.resendTimer);
  }

  // ================== FORMS ==================

  private buildForms() {
    this.profileForm = this.fb.group({
      fullName: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(20),
        ],
      ],
    });

    this.emailForm = this.fb.group({
      newEmail: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.maxLength(100),
        ],
      ],
    });

    this.emailCodeForm = this.fb.group({
      code: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(6),
        ],
      ],
    });

    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: [
          '',
          [
            Validators.required,
            Validators.minLength(6),
            Validators.maxLength(50),
            passwordComplexityValidator,
          ],
        ],
        confirmNewPassword: ['', [Validators.required]],
      },
      { validators: [passwordsMatchValidator('newPassword', 'confirmNewPassword')] },
    );
  }

  // ================== CARGAR DATOS ==================

  loadMe() {
    this.loading = true;
    this.loadError = null;

    const s = this.accountSvc
      .getMe()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: AccountMe) => {
          this.me = res;
          this.profileForm.patchValue({ fullName: res.fullName });
        },
        error: (err: any) => {
          const msg =
            err?.error?.message ||
            err?.message ||
            'No se pudo cargar los datos de tu cuenta.';
          this.loadError = String(msg);
        },
      });

    this.sub.add(s);
  }

  // ================== PERFIL / NOMBRE ==================

  startEditName() {
    if (!this.me) return;
    this.editingName = true;
    this.profileError = null;
    this.profileSuccess = null;
    this.profileForm.patchValue({ fullName: this.me.fullName });
  }

  cancelEditName() {
    this.editingName = false;
    this.profileForm.reset({
      fullName: this.me?.fullName ?? '',
    });
    this.profileError = null;
    this.profileSuccess = null;
  }

  saveProfile() {
  if (!this.me) return;
  this.profileError = null;
  this.profileSuccess = null;

  if (this.profileForm.invalid) {
    this.profileForm.markAllAsTouched();
    return;
  }

  const fullName = this.fullNameCtrl.value;

  if (fullName === this.me.fullName) return;

  this.profileSaving = true;

  const s = this.accountSvc.updateProfile({ fullName })
    .pipe(finalize(() => (this.profileSaving = false)))
    .subscribe({
      next: (res: AccountMe) => {
        this.me = res;                               // ✅ ya viene con fullName
        this.profileSuccess = 'Nombre de usuario actualizado correctamente.';
        this.editingName = false;
      },
      error: (err: any) => {
        const msg = err?.error?.message || err?.message || 'No se pudo actualizar el nombre de usuario.';
        this.profileError = Array.isArray(msg) ? msg.join(' ') : String(msg);
      },
    });

  this.sub.add(s);
}


  // ================== EMAIL ==================

  openEmailModal() {
    this.showEmailModal = true;
    this.emailStep = 'edit';
    this.emailError = null;
    this.emailSuccess = null;
    this.emailForm.reset();
    this.emailCodeForm.reset();
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
      this.resendSeconds = 0;
    }
  }

  closeEmailModal() {
    this.showEmailModal = false;
  }

  submitNewEmail() {
    this.emailError = null;
    this.emailSuccess = null;

    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    const newEmail = this.newEmail.value as string;

    this.emailLoading = true;
    const s = this.accountSvc
      .requestEmailChange({ newEmail })
      .pipe(finalize(() => (this.emailLoading = false)))
      .subscribe({
        next: () => {
          this.emailStep = 'verify';
          this.emailSuccess =
            'Te enviamos un código de verificación al nuevo email.';
          this.startResendCooldown();
        },
        error: (err: any) => {
          const msg =
            err?.error?.message ||
            err?.message ||
            'No se pudo iniciar el cambio de email.';
          this.emailError = Array.isArray(msg) ? msg.join(' ') : String(msg);
        },
      });

    this.sub.add(s);
  }

  verifyNewEmail() {
    this.emailError = null;
    this.emailSuccess = null;

    if (this.emailCodeForm.invalid || this.emailForm.invalid) {
      this.emailCodeForm.markAllAsTouched();
      this.emailForm.markAllAsTouched();
      return;
    }

    const newEmail = this.newEmail.value as string;
    const code = this.emailCode.value as string;

    this.emailLoading = true;

    const s = this.accountSvc
      .confirmEmailChange({ newEmail, code })
      .pipe(finalize(() => (this.emailLoading = false)))
      .subscribe({
        next: (res: any) => {
          if (this.me) {
            this.me = { ...this.me, email: res.email ?? newEmail };
          }
          this.emailSuccess = 'Email actualizado correctamente.';
          this.closeEmailModal();
        },
        error: (err: any) => {
          const msg =
            err?.error?.message ||
            err?.message ||
            'No se pudo confirmar el cambio de email.';
          this.emailError = Array.isArray(msg) ? msg.join(' ') : String(msg);
        },
      });

    this.sub.add(s);
  }

  resendEmailCode() {
    if (this.resendSeconds > 0 || this.emailForm.invalid) return;

    const newEmail = this.newEmail.value as string;
    this.emailError = null;

    const s = this.accountSvc
      .resendEmailChangeCode({ newEmail })
      .subscribe({
        next: () => {
          this.emailSuccess = 'Se envió un nuevo código.';
          this.startResendCooldown();
        },
        error: (err: any) => {
          const msg =
            err?.error?.message ||
            err?.message ||
            'No se pudo reenviar el código.';
          this.emailError = Array.isArray(msg) ? msg.join(' ') : String(msg);
        },
      });

    this.sub.add(s);
  }

  private startResendCooldown() {
    this.resendSeconds = 30;
    if (this.resendTimer) clearInterval(this.resendTimer);
    this.resendTimer = setInterval(() => {
      this.resendSeconds--;
      if (this.resendSeconds <= 0 && this.resendTimer) {
        clearInterval(this.resendTimer);
        this.resendTimer = null;
      }
    }, 1000);
  }

  // ================== PASSWORD ==================

  openPasswordModal() {
    this.showPasswordModal = true;
    this.passwordError = null;
    this.passwordSuccess = null;
    this.passwordForm.reset();
  }

  closePasswordModal() {
    this.showPasswordModal = false;
  }

  changePassword() {
    this.passwordError = null;
    this.passwordSuccess = null;

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } =
      this.passwordForm.getRawValue() as {
        currentPassword: string;
        newPassword: string;
        confirmNewPassword: string;
      };

    this.passwordLoading = true;

    const s = this.accountSvc
      .changePassword({ currentPassword, newPassword })
      .pipe(finalize(() => (this.passwordLoading = false)))
      .subscribe({
        next: () => {
          this.passwordSuccess = 'Contraseña actualizada correctamente.';
          this.closePasswordModal();
        },
        error: (err: any) => {
          const msg =
            err?.error?.message ||
            err?.message ||
            'No se pudo cambiar la contraseña.';
          this.passwordError = Array.isArray(msg) ? msg.join(' ') : String(msg);
        },
      });

    this.sub.add(s);
  }
}

/* ======== validadores reutilizables ======== */

function passwordsMatchValidator(
  passField: string,
  confirmField: string,
) {
  return (group: AbstractControl): ValidationErrors | null => {
    const pass = group.get(passField)?.value ?? '';
    const confirm = group.get(confirmField)?.value ?? '';
    return pass && confirm && pass !== confirm
      ? { passwordsMismatch: true }
      : null;
  };
}

function passwordComplexityValidator(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value || '';
  const hasUpper = /[A-Z]/.test(v);
  const hasLower = /[a-z]/.test(v);
  const hasNumOrSymbol = /(\d|\W)/.test(v);

  return hasUpper && hasLower && hasNumOrSymbol
    ? null
    : { weakPassword: true };
}
