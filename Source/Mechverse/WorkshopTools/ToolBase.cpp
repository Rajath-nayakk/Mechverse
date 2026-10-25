#include "ToolBase.h"

AToolBase::AToolBase()
	: ToolName(FText::FromString(TEXT("Standard 1/2\" Torque Wrench")))
	, Category(EToolCategory::TorqueWrench)
	, ToolDriveSize(EDriveSize::Drive1_2Inch)
	, bHasSocketInstalled(true)
	, InstalledSocket(17.0f, EDriveSize::Drive1_2Inch, EFastenerDriveType::HexMetric)
	, InstalledSocketSizeMm(17.0f)
	, ConfiguredTorqueSettingNm(25.0f)
{
	PrimaryActorTick.bCanEverTick = false;
}

bool AToolBase::InstallSocket(const FSocketSpecification& NewSocket, FText& OutMessage)
{
	if (NewSocket.DriveSize != ToolDriveSize)
	{
		OutMessage = FText::FromString(TEXT("Drive size mismatch! Cannot mount socket to tool anvil."));
		return false;
	}

	if (!FMath::IsFinite(NewSocket.SocketSizeMm) || NewSocket.SocketSizeMm <= 0.0f)
	{
		OutMessage = FText::FromString(TEXT("Invalid socket size."));
		return false;
	}

	InstalledSocket = NewSocket;
	bHasSocketInstalled = true;
	InstalledSocketSizeMm = NewSocket.SocketSizeMm;
	OutMessage = FText::FromString(FString::Printf(TEXT("Installed %.1f mm socket on tool."), InstalledSocketSizeMm));
	return true;
}

void AToolBase::RemoveSocket()
{
	bHasSocketInstalled = false;
	InstalledSocketSizeMm = 0.0f;
}

bool AToolBase::CanOperateOnFastener(const FFastenerSpecification& FastenerSpec, FText& OutFailureReason) const
{
	if (Category != EToolCategory::HandWrench && 
		Category != EToolCategory::RatchetSocket && 
		Category != EToolCategory::TorqueWrench && 
		Category != EToolCategory::ImpactGun)
	{
		OutFailureReason = FText::FromString(TEXT("Selected tool cannot tighten or loosen fasteners."));
		return false;
	}

	const bool bRequiresSocket = Category != EToolCategory::HandWrench;

	if (bRequiresSocket && !bHasSocketInstalled)
	{
		OutFailureReason = FText::FromString(TEXT("No socket installed. Attach a compatible socket first."));
		return false;
	}

	if (bHasSocketInstalled && InstalledSocket.DriveSize != ToolDriveSize)
	{
		OutFailureReason = FText::FromString(TEXT("Socket drive size does not match the tool anvil."));
		return false;
	}

	if (!FMath::IsFinite(FastenerSpec.SocketSizeMm) || FastenerSpec.SocketSizeMm <= 0.0f)
	{
		OutFailureReason = FText::FromString(TEXT("Fastener has an invalid required socket size."));
		return false;
	}

	const float EffectiveSocketSizeMm = bHasSocketInstalled ? InstalledSocket.SocketSizeMm : InstalledSocketSizeMm;

	if (!FMath::IsFinite(EffectiveSocketSizeMm) || EffectiveSocketSizeMm <= 0.0f)
	{
		OutFailureReason = FText::FromString(TEXT("No valid tool head size is configured."));
		return false;
	}

	if (FMath::Abs(EffectiveSocketSizeMm - FastenerSpec.SocketSizeMm) > 0.1f)
	{
		OutFailureReason = FText::FromString(FString::Printf(
			TEXT("Incorrect socket: requires %.1f mm (installed: %.1f mm)."), 
			FastenerSpec.SocketSizeMm, 
			EffectiveSocketSizeMm));
		return false;
	}

	if (bHasSocketInstalled && InstalledSocket.Profile != FastenerSpec.DriveType)
	{
		OutFailureReason = FText::FromString(TEXT("Fastener head profile mismatch (Hex, Torx, etc.)."));
		return false;
	}

	OutFailureReason = FText::FromString(TEXT("Tool is compatible with the selected fastener."));
	return true;
}
