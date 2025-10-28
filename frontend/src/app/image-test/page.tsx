import Image from "next/image"

export default function Test() {
  return (
    <div className="min-h-screen grid place-items-center p-8">
      <div className="relative w-[50vw] h-[60vh] border border-border rounded-xl overflow-hidden">
        <Image
          src="https://res.cloudinary.com/dtuqbqgz7/image/upload/v1755188111/56880b0f-d173-4cfa-b68d-000a7b5a8339_nkrj9w.png"
          alt="test"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  )
}


