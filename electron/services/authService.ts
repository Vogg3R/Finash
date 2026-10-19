import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/userRepository';
import { auditLogRepository } from '../repositories/auditLogRepository';

export interface UserSession {
  id: number;
  kullanici_adi: string;
  rol: 'admin' | 'cashier' | 'washer';
  ilkgiris_sifre_degistir: boolean;
}

export const authService = {
  async login(username: string, passwordOrPin: string): Promise<{ success: boolean; user?: UserSession; error?: string }> {
    const user = await userRepository.findByUsername(username);
    if (!user) {
      return { success: false, error: 'Kullanıcı bulunamadı.' };
    }

    if (!user.aktif) {
      return { success: false, error: 'Bu kullanıcı hesabı pasiftir.' };
    }

    const isMatch = await bcrypt.compare(passwordOrPin, user.sifre_hash);
    if (!isMatch) {
      return { success: false, error: 'Hatalı şifre veya PIN.' };
    }

    return {
      success: true,
      user: {
        id: user.id,
        kullanici_adi: user.kullanici_adi,
        rol: user.rol,
        ilkgiris_sifre_degistir: user.ilkgiris_sifre_degistir,
      },
    };
  },

  async changePassword(userId: number, newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!newPassword || newPassword.length < 4) {
      return { success: false, error: 'Yeni şifre en az 4 karakter veya haneli olmalıdır.' };
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await userRepository.updatePassword(userId, newHash);
    await auditLogRepository.log({
      user_id: userId,
      eylem: 'SIFRE_DEGISTIRILDI',
      tablo: 'users',
      kayit_id: userId,
    });

    return { success: true };
  },

  async verifyAdminPin(pin: string): Promise<boolean> {
    const admin = await userRepository.findByUsername('admin');
    if (!admin || !admin.aktif) return false;
    return bcrypt.compare(pin, admin.sifre_hash);
  },

  async getUsers() {
    return userRepository.getAllUsers();
  },

  async createUser(adminUserId: number, data: { kullanici_adi: string; sifre: string; rol: 'admin' | 'cashier' | 'washer' }) {
    const existing = await userRepository.findByUsername(data.kullanici_adi);
    if (existing) {
      throw new Error('Bu kullanıcı adı zaten kullanılmaktadır.');
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(data.sifre, salt);

    const created = await userRepository.createUser({
      kullanici_adi: data.kullanici_adi,
      sifre_hash: hash,
      rol: data.rol,
      ilkgiris_sifre_degistir: false,
    });

    await auditLogRepository.log({
      user_id: adminUserId,
      eylem: 'KULLANICI_OLUSTURULDU',
      tablo: 'users',
      kayit_id: created.id,
      yeni_deger: JSON.stringify({ kullanici_adi: data.kullanici_adi, rol: data.rol }),
    });

    return created;
  },

  async updateUserRoleOrStatus(adminUserId: number, targetUserId: number, data: { rol?: 'admin' | 'cashier' | 'washer'; aktif?: boolean }) {
    const target = await userRepository.findById(targetUserId);
    if (!target) throw new Error('Kullanıcı bulunamadı.');

    await userRepository.updateUser(targetUserId, data);
    await auditLogRepository.log({
      user_id: adminUserId,
      eylem: 'KULLANICI_GUNCELLENDI',
      tablo: 'users',
      kayit_id: targetUserId,
      eski_deger: JSON.stringify({ rol: target.rol, aktif: target.aktif }),
      yeni_deger: JSON.stringify(data),
    });
  },
};
