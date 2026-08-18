import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserProfileFormSchema } from '@/lib/validation';
import type { UserProfile, UserProfileFormValues } from '@/types';
import { userProfileRepository } from '@/db/repositories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImagePickerField } from '@/components/common/ImagePickerField';

interface ProfileFormProps {
  initial?: UserProfile;
  onSaved?: () => void;
}

// FR-DAT-01. Feeds the report header (§13.1) once populated.
export function ProfileForm({ initial, onSaved }: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserProfileFormValues>({
    resolver: zodResolver(UserProfileFormSchema),
    defaultValues: initial ?? {
      name: '',
      nip: '',
      position: '',
      unit: '',
      email: '',
      defaultYear: new Date().getFullYear(),
      timezone: 'Asia/Makassar',
    },
  });

  /**
   * Gambar tidak ikut react-hook-form: nilainya bukan hasil ketikan melainkan
   * hasil olahan berkas, dan menaruhnya di form state hanya menambah lapisan
   * tanpa memberi validasi apa pun.
   */
  const [photoDataUrl, setPhotoDataUrl] = useState(initial?.photoDataUrl);
  const [logoDataUrl, setLogoDataUrl] = useState(initial?.logoDataUrl);

  async function onSubmit(values: UserProfileFormValues) {
    await userProfileRepository.save({
      ...values,
      photoDataUrl,
      logoDataUrl,
      id: 'me',
      updatedAt: new Date().toISOString(),
    });
    onSaved?.();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <ImagePickerField
              label="Foto profil"
              hint="Tampil di sidebar dan bilah atas. Disimpan di perangkat ini."
              shape="circle"
              value={photoDataUrl}
              onChange={setPhotoDataUrl}
            />
            <ImagePickerField
              label="Logo unit kerja"
              hint="Dipakai pada kop PDF Data Dukung, menggantikan logo BPS bawaan."
              value={logoDataUrl}
              onChange={setLogoDataUrl}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Nama (termasuk gelar)</Label>
            <Input id="name" placeholder="mis. I Made Contoh, S.Tr.Stat" {...register('name')} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nip">NIP</Label>
            <Input id="nip" inputMode="numeric" placeholder="18 digit" {...register('nip')} />
            {errors.nip ? <p className="text-xs text-destructive">{errors.nip.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="position">Jabatan</Label>
            <Input id="position" {...register('position')} />
            {errors.position ? (
              <p className="text-xs text-destructive">{errors.position.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="unit">Unit Kerja</Label>
            <Input id="unit" placeholder="mis. BPS Kabupaten Buleleng" {...register('unit')} />
            {errors.unit ? <p className="text-xs text-destructive">{errors.unit.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email (opsional)</Label>
            <Input id="email" type="email" {...register('email')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="defaultYear">Tahun Default</Label>
            <Input
              id="defaultYear"
              type="number"
              {...register('defaultYear', { valueAsNumber: true })}
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            Simpan Profil
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
